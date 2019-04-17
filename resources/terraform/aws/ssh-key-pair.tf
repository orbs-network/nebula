resource "aws_key_pair" "deployer" {
  key_name   = "${var.application}-${var.name}-deployer"
  public_key = "${file(var.path_to_ssh_pubkey)}"
}
