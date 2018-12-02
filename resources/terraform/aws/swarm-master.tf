resource "aws_instance" "master" {
  ami             = "${var.aws_ami_id}"
  instance_type   = "${var.aws_orbs_master_instance_type}"
  security_groups = ["${aws_security_group.swarm.name}"]
  key_name        = "${aws_key_pair.deployer.key_name}"

  user_data = "#!/bin/sh\nsudo bash -c \"curl -L https://s3.amazonaws.com/orbs-network-releases/infrastructure/boyar/boyar-9e8a5440065ab1d37ec2038c0e8615c931703467.bin -o /usr/bin/boyar && chmod +x /usr/bin/boyar && apt-get update && apt-get install -y docker.io python-pip && pip install awscli && service docker start\""

  tags = {
    Name = "constellation-swarm-master"
  }
}
