locals {
  ethereum_user_data = <<TFEOF
#! /bin/bash

# Mount external volume as docker lib

while true; do
  sleep 1
  test -e /dev/nvme1n1 && break
done

mkfs.ext4 /dev/nvme1n1
mkdir -p /mnt/data/
mount /dev/nvme1n1 /mnt/data/

# Remove old instances of Docker which might ship with ubuntu
apt-get remove docker docker-engine docker.io

apt-get update
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

docker run -d \
  -p 8545:8545 \
  -p 8080:8080
  -p 30303:30303 \
  --restart always \
  -v /mnt/data/ethereum-root:/home/parity \
  --name ethereum \
  parity/parity:stable --chain ropsten

TFEOF
}

resource "aws_subnet" "ethereum" {
  vpc_id            = "${module.vpc.id}"
  cidr_block        = "172.31.100.0/24"
  availability_zone = "${aws_ebs_volume.ethereum.availability_zone}"

  tags = {
    Name = "constellation-${var.run_identifier}-ethereum-subnet"
  }
}

resource "aws_instance" "ethereum" {
  ami               = "${var.aws_ami_id}"
  availability_zone = "${aws_ebs_volume.ethereum.availability_zone}"
  instance_type     = "${var.aws_ether_instance_type}"
  security_groups   = ["${aws_security_group.ethereum.id}"]
  key_name          = "${aws_key_pair.deployer.key_name}"
  subnet_id         = "${ aws_subnet.ethereum.id }"
  private_ip        = "172.31.100.100"

  user_data = "${local.ethereum_user_data}"

  tags = {
    Name = "constellation-${var.run_identifier}-ethereum"
  }
}
