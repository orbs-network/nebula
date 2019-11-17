locals {
  manager_user_data = <<TFEOF
#!/bin/sh

# Mount external volume as docker lib

while true; do
  sleep 1
  test -e /dev/xvdh && break
done

mkfs -t ext4 /dev/xvdh
mkdir /mnt/data
cp /etc/fstab /etc/fstab.bak
echo '/dev/xvdh /mnt/data ext4 defaults,nofail 0 0' >> /etc/fstab
mount -a

mkdir -p /mnt/data/var/lib/docker
mkdir -p /mnt/data/var/lib/containerd
ln -s /mnt/data/var/lib/docker /var/lib/docker
ln -s /mnt/data/var/lib/containerd /var/lib/containerd

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

curl -L https://s3.amazonaws.com/orbs-network-releases/infrastructure/boyar/boyar-${var.boyar_version}.bin -o /usr/bin/boyar && chmod +x /usr/bin/boyar

apt-get install -y python-pip && pip install awscli

docker swarm init

mkdir -p /opt/orbs
aws secretsmanager get-secret-value --region ${var.region} --secret-id ${local.secret_name} --output text --query SecretBinary | base64 -d > /opt/orbs/keys.json

# Retrive SSL keys if possible

mkdir -p /opt/orbs/ssl

export SSL_CERT_PATH=/opt/orbs/ssl/ssl-cert.pem
export SSL_PRIVATE_KEY_PATH=/opt/orbs/ssl/ssl-private-key.pem

aws secretsmanager get-secret-value --region ${var.region} --secret-id ${local.ssl_cert_secret_name} --output text --query SecretBinary | base64 -d > $SSL_CERT_PATH

aws secretsmanager get-secret-value --region ${var.region} --secret-id ${local.ssl_private_key_secret_name} --output text --query SecretBinary | base64 -d > $SSL_PRIVATE_KEY_PATH

# Save docker swarm token to secretsmanager

aws secretsmanager create-secret --region ${var.region} --name swarm-token-${var.name}-worker-${var.region} --secret-string $(docker swarm join-token --quiet worker) || aws secretsmanager put-secret-value --region ${var.region} --secret-id swarm-token-${var.name}-worker-${var.region} --secret-string $(docker swarm join-token --quiet worker)

# Remove access to secrets

aws iam detach-role-policy --role-name orbs-constellation-${var.name}-manager --policy-arn ${aws_iam_policy.swarm_manager_secrets.arn}

aws iam detach-role-policy --role-name orbs-constellation-${var.name}-manager --policy-arn ${aws_iam_policy.swarm_detach_role_policy.arn}

# Log into docker hub

$(aws ecr get-login --no-include-email --region us-west-2)

echo '0 * * * * $(/usr/local/bin/aws ecr get-login --no-include-email --region us-west-2)' > /tmp/crontab
crontab /tmp/crontab

# Wait for everyone to join the swarm
while true; do
    [ $(docker node ls --format '{{.ID}} {{.ManagerStatus}}' | grep -v Leader | wc -l) -ge ${var.instance_count} ] && break
    sleep 15
done

# Remove access to worker secrets

aws iam detach-role-policy --role-name orbs-constellation-${var.name}-worker --policy-arn ${aws_iam_policy.swarm_worker_secrets.arn}

# Label workers
for n in $(docker node ls --format '{{.ID}} {{.ManagerStatus}}' | grep -v Leader | cut -d" " -f1); do
    docker node update --label-add worker=true $n
done

# Label leader as manager
for n in $(docker node ls --format '{{.ID}} {{.ManagerStatus}}' | grep Leader | cut -d" " -f1); do
    docker node update --label-add manager=true $n
done

# Extract topology from Ethereum if possible
if [ ! -z "${var.ethereum_topology_contract_address}" ]; then
  export ETHEREUM_PARAMS="--ethereum-endpoint ${var.ethereum_endpoint} --topology-contract-address ${var.ethereum_topology_contract_address}"
fi

# Provision SSL if possible
if [ ! -z "$(cat $SSL_CERT_PATH)" ] && [ ! -z "$(cat $SSL_PRIVATE_KEY_PATH)" ]; then
  export SSL_PARAMS="--ssl-certificate $SSL_CERT_PATH --ssl-private-key $SSL_PRIVATE_KEY_PATH"
fi

# Boostrap everything with Boyar
HOME=/root nohup boyar --log /var/log/boyar.log --config-url ${var.s3_boyar_config_url} --keys /opt/orbs/keys.json --daemonize --max-reload-time-delay 0m $ETHEREUM_PARAMS $SSL_PARAMS &

TFEOF
}

resource "aws_instance" "manager" {
  ami = "${data.aws_ami.ubuntu-18_04.id}"
  instance_type = "${var.instance_type}"
  security_groups = ["${aws_security_group.swarm.id}"]
  key_name = "${aws_key_pair.deployer.key_name}"
  subnet_id = "${module.vpc.first_subnet.id}"
  iam_instance_profile = "${aws_iam_instance_profile.swarm_manager.name}"

  user_data = "${local.manager_user_data}"

  tags = {
    Name = "constellation-${var.name}-swarm-manager"
  }
}

resource "aws_ebs_volume" "manager_storage" {
  size = 50
  availability_zone = "${aws_instance.manager.availability_zone}"

  tags = {
    Name = "docker-storage-${var.name}-manager"
  }
}

resource "aws_volume_attachment" "manager_storage_attachment" {
  device_name = "/dev/sdh"
  force_detach = true
  volume_id = "${aws_ebs_volume.manager_storage.id}"
  instance_id = "${aws_instance.manager.id}"
}
