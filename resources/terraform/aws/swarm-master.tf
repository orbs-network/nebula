resource "aws_instance" "master" {
  ami             = "${var.aws_ami_id}"
  instance_type   = "${var.aws_orbs_master_instance_type}"
  security_groups = ["${aws_security_group.swarm.name}"]
  key_name        = "${aws_key_pair.deployer.key_name}"
  iam_instance_profile = "orbs-network"
  provisioner "file" {
    source      = "bootstrap-master.sh"
    destination = "/tmp/bootstrap.sh"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file("~/.ssh/id_rsa")}"
    }
  }

  provisioner "file" {
    source      = "docker-compose.yml"
    destination = "/home/ubuntu/docker-compose.yml"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file("~/.ssh/id_rsa")}"
    }
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x /tmp/bootstrap.sh",
      "/tmp/bootstrap.sh",
      #"docker stack deploy --compose-file /home/ubuntu/docker-compose.yml helloworld"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = "${file("~/.ssh/id_rsa")}"
    }
  }

  tags = {
    Name = "constellation-swarm-master"
  }
}
