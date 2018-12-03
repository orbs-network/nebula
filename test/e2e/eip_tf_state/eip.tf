variable "region" {
  default = "us-east-1"
}

variable "access_key" {
  default = "SOME_AMAZON_ACCESS_KEY"
}

variable "secret_key" {
  default = "SOME_AMAZON_SECRET_KEY"
}

provider "aws" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
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
