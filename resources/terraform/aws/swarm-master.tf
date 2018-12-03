resource "aws_instance" "master" {
  ami                  = "${var.aws_ami_id}"
  instance_type        = "${var.aws_orbs_master_instance_type}"
  security_groups      = ["${aws_security_group.swarm.name}"]
  key_name             = "${aws_key_pair.deployer.key_name}"
  iam_instance_profile = "orbs-network"

  user_data = "#!/bin/sh\ncurl -L https://s3.amazonaws.com/orbs-network-releases/infrastructure/boyar/boyar-9e8a5440065ab1d37ec2038c0e8615c931703467.bin -o /usr/bin/boyar && chmod +x /usr/bin/boyar && apt-get update && apt-get install -y docker.io python-pip && pip install awscli && service docker start && docker swarm init &&\naws secretsmanager create-secret --region ${var.region} --name swarm-token-worker-${var.region} --secret-string $(docker swarm join-token --quiet worker) || aws secretsmanager put-secret-value --region ${var.region} --secret-id swarm-token-worker-${var.region} --secret-string $(docker swarm join-token --quiet worker)"

  tags = {
    Name = "constellation-swarm-master"
  }
}
