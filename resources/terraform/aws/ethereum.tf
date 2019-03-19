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

# Do not sync data from S3 because it's too complicated right now
# Sync data from S3
#if [ ! -z "${var.ethereum_sync_s3_bucket}" ]; then
#   export INSTANCE_ID=$(curl -L http://169.254.169.254/latest/meta-data/instance-id)
#   export REGION=$(curl -s -L http://169.254.169.254/latest/meta-data/placement/availability-zone | sed -e s/.$//)

#   export VOLUME_ID=$(aws ec2 describe-volumes --region $REGION --filters "Name=tag:Name,Values=$VOLUME_NAME" --query "Volumes[0].VolumeId" --output text)

#   aws ec2 attach-volume --device /dev/xvdh --instance-id $INSTANCE_ID --volume-id $VOLUME_ID --region $REGION

#   while true; do
#     sleep 1
#     test -e /dev/xvdh && break
#   done

#   mkdir /ethereum-persistency
#   cp /etc/fstab etc/fstab.bak
#   echo '/dev/xvdh /ethereum-persistency ext4 defaults,nofail 0 0' >> /etc/fstab
#   mount -a

#   # Check if there is any data in bootstrap
#   export CHAIN_DIR=${var.ethereum_chain}
#   if [ "${var.ethereum_chain}" == "mainnet" ]; then
#     export CHAIN_DIR=ethereum
#   fi

#   if [ ! -d /ethereum-persistency/chains/$CHAIN_DIR ]; then
#     # Very important step
#     chown -R ubuntu:ubuntu /ethereum-persistency/

#     su ubuntu -c "aws s3 sync s3://${var.ethereum_sync_s3_bucket}/${var.ethereum_chain}/ /ethereum-persistency/chains/$CHAIN_DIR"
#   fi
# fi

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
  --pruning-history 2000

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
