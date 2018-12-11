locals {
  secret_name = "orbs-network-node-keys-${var.context_id}"
}

resource "aws_secretsmanager_secret" "node_key_pair" {
  name = "${local.secret_name}"
}

resource "aws_secretsmanager_secret_version" "node_key_pair_value" {
  secret_id     = "${aws_secretsmanager_secret.node_key_pair.id}"
  secret_binary = "${var.node_key_pair}"
}
