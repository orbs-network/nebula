locals {
  slave_user_data = <<TFEOF
#!/bin/sh

# Mount external volume as docker lib

mkfs.ext4 /dev/nvme1n1
mkdir -p /var/lib/docker
mount /dev/nvme1n1 /var/lib/docker

# Sysctl

sysctl -w net.core.somaxconn=128000


# Remove old instances of Docker which might ship with ubuntu
sudo apt-get remove docker docker-engine docker.io

sudo apt-get update
sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
# Complete fingerprint: 9DC8 5822 9FC7 DD38 854A E2D8 8D81 803C 0EBF CD88
sudo apt-key fingerprint 0EBFCD88

sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"

sudo apt-get update
sudo apt-get install -y docker-ce

apt-get install -y python-pip && pip install awscli

while true; do
    docker swarm join --token $(aws secretsmanager get-secret-value --region ${var.region} --secret-id swarm-token-worker-${var.region} --output text --query SecretString) ${aws_instance.master.private_ip} && break
    sleep 15
done

TFEOF
}

resource "aws_instance" "slave" {
  count                = 2
  ami                  = "${var.aws_ami_id}"
  instance_type        = "${var.aws_orbs_slave_instance_type}"
  security_groups      = ["${aws_security_group.swarm.name}"]
  key_name             = "${aws_key_pair.deployer.key_name}"
  iam_instance_profile = "orbs-network"

  user_data = "${local.slave_user_data}"

  tags = {
    Name = "constellation-swarm-worker-${count.index}"
  }
}

resource "aws_ebs_volume" "slave_storage" {
  count             = 2
  size              = 50
  availability_zone = "${element(aws_instance.slave.*.availability_zone, count.index)}"

  tags {
    Name = "constellation-docker-storage"
  }
}

resource "aws_volume_attachment" "slave_storage_attachment" {
  count       = 2
  device_name = "/dev/sdh"
  volume_id   = "${element(aws_ebs_volume.slave_storage.*.id, count.index)}"
  instance_id = "${element(aws_instance.slave.*.id, count.index)}"
}
