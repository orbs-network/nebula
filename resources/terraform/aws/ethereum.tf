locals {
  ethereum_user_data = <<TFEOF
#! /bin/bash

# Remove old instances of Docker which might ship with ubuntu
apt-get remove docker docker-engine docker.io

apt-get update && apt-get -y upgrade
apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
# Complete fingerprint: 9DC8 5822 9FC7 DD38 854A E2D8 8D81 803C 0EBF CD88
apt-key fingerprint 0EBFCD88

add-apt-repository \
  "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) \
  stable"

apt-get update
apt-get install -y docker-ce

# Install AWS CLI
apt-get install -y python-pip
pip install awscli

# Create ebs for the ethereum persistence
export VOLUME_NAME=${var.run_identifier}-parity-${var.ethereum_chain}

docker plugin install --grant-all-permissions rexray/ebs
docker volume create --driver rexray/ebs --opt size=150 --opt volumetype=gp2 --name $VOLUME_NAME

# Run parity node
docker run -d \
  -p 8545:8545 \
  -p 8546:8546 \
  -p 8080:8080 \
  -p 30303:30303 \
  --restart always \
  --name ethereum \
  -v $VOLUME_NAME:/home/parity/ \
  parity/parity:stable \
  --chain ${var.ethereum_chain} \
  --base-path /home/parity/data \
  --min-peers=45 --max-peers=60 \
  --no-secretstore --jsonrpc-interface all --no-ui --no-ipc --no-ws \
  --pruning-history 5000

TFEOF
}

resource "aws_subnet" "ethereum" {
  count                   = "${var.ethereum_count}"
  vpc_id                  = "${module.vpc.id}"
  cidr_block              = "172.31.100.0/24"
  availability_zone = "${aws_instance.manager.availability_zone}"
  map_public_ip_on_launch = true

  tags = {
    Name = "constellation-${var.run_identifier}-ethereum-subnet"
  }
}

resource "aws_instance" "ethereum" {
  ami               = "${data.aws_ami.ubuntu-18_04.id}"
  count             = "${var.ethereum_count}"
  availability_zone = "${aws_instance.manager.availability_zone}"
  instance_type     = "${var.aws_ether_instance_type}"
  security_groups   = ["${aws_security_group.ethereum.id}"]
  key_name          = "${aws_key_pair.deployer.key_name}"
  subnet_id         = "${ aws_subnet.ethereum.id }"
  private_ip        = "172.31.100.100"
  iam_instance_profile = "${ aws_iam_instance_profile.ethereum.name }"

  user_data = "${local.ethereum_user_data}"

  tags = {
    Name = "constellation-${var.run_identifier}-ethereum"
  }
}
