resource "aws_key_pair" "deployer" {
  key_name = "${var.application}-${var.run_identifier}-deployer"
  public_key = "${file("~/.ssh/id_rsa.pub")}"
}