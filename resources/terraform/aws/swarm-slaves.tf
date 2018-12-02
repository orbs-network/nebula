resource "aws_instance" "slave" {
  count           = 2
  ami             = "${var.aws_ami_id}"
  instance_type   = "${var.aws_orbs_slave_instance_type}"
  security_groups = ["${aws_security_group.swarm.name}"]
  key_name        = "${aws_key_pair.deployer.key_name}"

  user_data = "#!/bin/sh\necho success ${aws_instance.master.private_ip} > /tmp/test"

  tags = {
    Name = "constellation-swarm-worker-${count.index}"
  }
}
