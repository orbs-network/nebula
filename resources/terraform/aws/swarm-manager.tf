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
apt-get install -y docker-ce jq nginx

apt-get install -y python-pip && pip install awscli

mkdir -p /opt/orbs
aws secretsmanager get-secret-value --region ${var.region} --secret-id ${local.secret_name} --output text --query SecretBinary | base64 -d > /opt/orbs/keys.json

# Retrive SSL keys if possible

mkdir -p /opt/orbs/ssl

export SSL_CERT_PATH=/opt/orbs/ssl/ssl-cert.pem
export SSL_PRIVATE_KEY_PATH=/opt/orbs/ssl/ssl-private-key.pem

aws secretsmanager get-secret-value --region ${var.region} --secret-id ${local.ssl_cert_secret_name} --output text --query SecretBinary | base64 -d > $SSL_CERT_PATH

aws secretsmanager get-secret-value --region ${var.region} --secret-id ${local.ssl_private_key_secret_name} --output text --query SecretBinary | base64 -d > $SSL_PRIVATE_KEY_PATH

# Log into docker hub

$(aws ecr get-login --no-include-email --region us-west-2)

echo '0 * * * * $(/usr/local/bin/aws ecr get-login --no-include-email --region us-west-2)' > /tmp/crontab
crontab /tmp/crontab

# Install supervisord to keep Boyar alive even after a restart to the EC2 instance
apt-get install -y supervisor tar
export node_address=$(cat /opt/orbs/keys.json | jq '."node-address"')

%{for chain in var.chains}

echo "{
  \"virtual-chain-id\": ${chain.id},
  \"node-address\": $node_address,
  \"active-consensus-algo\": 2,  
  \"genesis-validator-addresses\": [
    %{for validator in chain.genesis_validator_addresses}
      \"${validator.address}\" %{if validator.last != 1},%{endif}
    %{endfor}
  ],
  \"topology-nodes\": [
    %{for peer in var.topology}
      {\"address\":\"${peer.address}\",\"ip\":\"${peer.ip}\",\"port\":${chain.gossip_port}} %{if peer.last != 1},%{endif}
    %{endfor}
  ],
  \"ethereum-endpoint\": \"http://192.168.199.6:8545\",
  \"logger-full-log\": false,
  \"processor-sanitize-deployed-contracts\": false,
  \"profiling\": true
}" > /opt/orbs/chain-${chain.id}-config.json

docker run --name orbs-${chain.id} \
  -v /opt/orbs/chain-${chain.id}-config.json:/opt/orbs/chain-${chain.id}-config.json:ro \
  -v /opt/orbs/keys.json:/opt/orbs/keys.json:ro \
  -d -p "${chain.gossip_port}:4400" \
  -p "${chain.http_port}:8080" \
  ${chain.docker.image}:${chain.docker.tag} /opt/orbs/orbs-node --config /opt/orbs/chain-${chain.id}-config.json --config /opt/orbs/keys.json
%{endfor}

curl -L https://github.com/prometheus/node_exporter/releases/download/v${var.node_exporter_version}/node_exporter-${var.node_exporter_version}.linux-amd64.tar.gz -o /home/ubuntu/node_exporter.tar.gz
cd /home/ubuntu
tar xvfz node_exporter.tar.gz && mv node_exporter-0.18.1.linux-amd64/node_exporter .
chmod +x node_exporter
rm -f node_exporter.tar.gz

echo "[program:node_exporter]
command=/home/ubuntu/node_exporter --collector.ntp --collector.tcpstat --collector.supervisord
autostart=true
autorestart=true
stderr_logfile=/var/log/node_exporter.err.log
stdout_logfile=/var/log/node_exporter.log" >> /etc/supervisor/conf.d/node_exporter.conf

supervisorctl reread && supervisorctl update

echo "server {
    listen 80;
    listen [::]:80;
    server_name localhost;

    gzip on;
    gzip_types      text/plain application/json;
    gzip_proxied    any;
    gzip_min_length 1000;

    rewrite_log on;

    root /usr/share/nginx/html;
    index index.html;

    %{for chain in var.chains}
    location ~* /vchains/${chain.id}/(.*) {
        rewrite ^/vchains/${chain.id}/(.*)$ /\$1 break;
        proxy_pass http://localhost:${chain.http_port};
    }
    %{endfor}
}" > /etc/nginx/conf.d/orbs.conf

rm -f /etc/nginx/sites-enabled/default

systemctl restart nginx

TFEOF
}



resource "aws_instance" "manager" {
  ami                  = "${data.aws_ami.ubuntu-18_04.id}"
  instance_type        = "${var.instance_type}"
  security_groups      = ["${aws_security_group.swarm.id}"]
  key_name             = "${aws_key_pair.deployer.key_name}"
  subnet_id            = "${module.vpc.first_subnet.id}"
  iam_instance_profile = "${aws_iam_instance_profile.swarm_manager.name}"

  user_data = "${local.manager_user_data}"

  tags = {
    Name = "constellation-${var.name}-swarm-manager"
  }
}

resource "aws_ebs_volume" "manager_storage" {
  size              = 50
  availability_zone = "${aws_instance.manager.availability_zone}"

  tags = {
    Name = "docker-storage-${var.name}-manager"
  }
}

resource "aws_volume_attachment" "manager_storage_attachment" {
  device_name  = "/dev/sdh"
  force_detach = true
  volume_id    = "${aws_ebs_volume.manager_storage.id}"
  instance_id  = "${aws_instance.manager.id}"
}
