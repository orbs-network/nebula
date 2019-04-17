locals {
  ssl_cert_secret_name = "orbs-network-node-ssl-certificate-${var.name}"
  ssl_private_key_secret_name = "orbs-network-node-ssl-private-key-${var.name}"
}

resource "aws_secretsmanager_secret" "ssl_certificate" {
  recovery_window_in_days = 0
  name = "${local.ssl_cert_secret_name}"
}

resource "aws_secretsmanager_secret_version" "ssl_certificate_version" {
  secret_id     = "${aws_secretsmanager_secret.ssl_certificate.id}"
  secret_binary = "${var.ssl_certificate}"
}

resource "aws_secretsmanager_secret" "ssl_private_key" {
  recovery_window_in_days = 0
  name = "${local.ssl_private_key_secret_name}"
}

resource "aws_secretsmanager_secret_version" "ssl_private_key_version" {
  secret_id     = "${aws_secretsmanager_secret.ssl_private_key.id}"
  secret_binary = "${var.ssl_private_key}"
}
