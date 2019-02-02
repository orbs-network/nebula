resource "aws_key_pair" "deployer" {
  key_name   = "${var.application}-${var.run_identifier}-deployer"
  public_key = "${file(var.path_to_ssh_pubkey)}"
}
