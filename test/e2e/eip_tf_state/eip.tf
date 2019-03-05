variable "region" {
  default = "us-east-1"
}

variable "ethAZ" {
  default = "us-east-1b"
}

provider "aws" {
  profile = "default"
  region     = "${var.region}"
}

resource "aws_eip" "foobar" {
  vpc = true

  tags = {
    Name = "foobar"
  }
}

output "foobar.ip" {
  value = "${aws_eip.foobar.public_ip}"
}

output "ethereum.id" {
  value = "${aws_ebs_volume.ethereum.id}"
}
