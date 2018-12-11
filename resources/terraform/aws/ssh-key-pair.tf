resource "aws_key_pair" "deployer" {
  key_name = "${var.application}-deployer"
  public_key = "${file("~/.ssh/id_rsa.pub")}"
}