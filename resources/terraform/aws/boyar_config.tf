locals {
  s3_bucket_name      = "orbs-network-config-staging-discovery-${var.region}"
  s3_boyar_key        = "boyar/config.json"
  s3_boyar_config_url = "https://s3-${var.region}.amazonaws.com/${local.s3_bucket_name}/${local.s3_boyar_key}"
}

resource "aws_s3_bucket" "s3_bucket" {
  bucket = "${local.s3_bucket_name}"
  acl    = "private"
  region = "${var.region}"
}

resource "aws_s3_bucket_object" "boyar_config" {
  bucket = "${aws_s3_bucket.s3_bucket.id}"
  key    = "${local.s3_boyar_key}"

  content      = "${var.boyar_config_source}"
  content_type = "application/json"

  acl = "public-read"
}
