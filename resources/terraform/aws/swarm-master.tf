locals {
  master_user_data = <<TFEOF
#!/bin/sh

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

export BOYAR_VERSION=b16ce842bb514eb96a65973873e301ae6e0b1272

curl -L https://s3.amazonaws.com/orbs-network-releases/infrastructure/boyar/boyar-$BOYAR_VERSION.bin -o /usr/bin/boyar && chmod +x /usr/bin/boyar

apt-get install -y python-pip && pip install awscli

docker swarm init

mkdir -p /opt/orbs
aws secretsmanager get-secret-value --region ${var.region} --secret-id orbs-network-node-keys-${var.context_id} --output text --query SecretBinary | base64 -d > /opt/orbs/keys.json

aws secretsmanager create-secret --region ${var.region} --name swarm-token-worker-${var.region} --secret-string $(docker swarm join-token --quiet worker) || aws secretsmanager put-secret-value --region ${var.region} --secret-id swarm-token-worker-${var.region} --secret-string $(docker swarm join-token --quiet worker)

$(aws ecr get-login --no-include-email --region us-west-2)

while true; do
    [ $(docker node ls -q | wc -l) -eq 3 ] && break
    sleep 15
done

HOME=/root nohup boyar --config-url ${local.s3_boyar_config_url} --orchestrator swarm --keys /opt/orbs/keys.json --daemonize > /var/log/boyar.log &

TFEOF
}

resource "aws_instance" "master" {
  ami                  = "${var.aws_ami_id}"
  instance_type        = "${var.aws_orbs_master_instance_type}"
  security_groups      = ["${aws_security_group.swarm.name}"]
  key_name             = "${aws_key_pair.deployer.key_name}"
  iam_instance_profile = "orbs-network"

  user_data = "${local.master_user_data}"

  tags = {
    Name = "constellation-swarm-master"
  }
}
