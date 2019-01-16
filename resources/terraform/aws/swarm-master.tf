locals {
  master_user_data = <<TFEOF
#!/bin/sh

# Mount external volume as docker lib

while true; do
  sleep 1
  test -e /dev/xvdh && break
done

mkfs.ext4 /dev/xvdh
mkdir -p /var/lib/docker
mount /dev/xvdh /var/lib/docker

# Sysctl

sysctl -w net.core.somaxconn=128000

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
docker plugin install --grant-all-permissions rexray/ebs

export BOYAR_VERSION=7855efc76e9122c07c804677592764805f99fe99

curl -L https://s3.amazonaws.com/orbs-network-releases/infrastructure/boyar/boyar-$BOYAR_VERSION.bin -o /usr/bin/boyar && chmod +x /usr/bin/boyar

apt-get install -y python-pip && pip install awscli

docker swarm init

mkdir -p /opt/orbs
aws secretsmanager get-secret-value --region ${var.region} --secret-id orbs-network-node-keys-${var.context_id} --output text --query SecretBinary | base64 -d > /opt/orbs/keys.json

aws secretsmanager create-secret --region ${var.region} --name swarm-token-${var.run_identifier}-worker-${var.region} --secret-string $(docker swarm join-token --quiet worker) || aws secretsmanager put-secret-value --region ${var.region} --secret-id swarm-token-${var.run_identifier}-worker-${var.region} --secret-string $(docker swarm join-token --quiet worker)

$(aws ecr get-login --no-include-email --region us-west-2)

echo '0 * * * * $(/usr/local/bin/aws ecr get-login --no-include-email --region us-west-2)' > /tmp/crontab
crontab /tmp/crontab

while true; do
    [ $(docker node ls -q | wc -l) -eq 3 ] && break
    sleep 15
done

HOME=/root nohup boyar --config-url ${var.s3_boyar_config_url} --orchestrator swarm --keys /opt/orbs/keys.json --daemonize > /var/log/boyar.log &

TFEOF
}

resource "aws_instance" "master" {
  ami                  = "${var.aws_ami_id}"
  instance_type        = "${var.aws_orbs_master_instance_type}"
  security_groups      = ["${aws_security_group.swarm.id}"]
  key_name             = "${aws_key_pair.deployer.key_name}"
  subnet_id            = "${ module.vpc.subnet-ids-public[0] }"
  iam_instance_profile = "${ aws_iam_instance_profile.swarm_master.name }"

  user_data = "${local.master_user_data}"

  tags = {
    Name = "constellation-${var.run_identifier}-swarm-master"
  }
}

resource "aws_ebs_volume" "master_storage" {
  size              = 50
  availability_zone = "${aws_instance.master.availability_zone}"

  tags {
    Name = "constellation-docker-storage"
  }
}

resource "aws_volume_attachment" "master_storage_attachment" {
  device_name = "/dev/sdh"
  volume_id   = "${aws_ebs_volume.master_storage.id}"
  instance_id = "${aws_instance.master.id}"
}
