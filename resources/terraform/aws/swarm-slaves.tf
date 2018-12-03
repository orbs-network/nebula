resource "aws_instance" "slave" {
  count                = 2
  ami                  = "${var.aws_ami_id}"
  instance_type        = "${var.aws_orbs_slave_instance_type}"
  security_groups      = ["${aws_security_group.swarm.name}"]
  key_name             = "${aws_key_pair.deployer.key_name}"
  iam_instance_profile = "orbs-network"

  user_data = "#!/bin/sh\napt-get update && apt-get install -y docker.io python-pip && pip install awscli && service docker start && while true; do docker swarm join --token $(aws secretsmanager get-secret-value --region ${var.region} --secret-id swarm-token-worker-${var.region} --output text --query SecretString) ${aws_instance.master.private_ip} && break; sleep 15; done"

  tags = {
    Name = "constellation-swarm-worker-${count.index}"
  }
}
