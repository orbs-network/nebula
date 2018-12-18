resource "aws_s3_bucket" "s3_bucket" {
  bucket = "${var.s3_bucket_name}"
  acl    = "private"
  region = "${var.region}"
}

resource "aws_s3_bucket_object" "boyar_config" {
  bucket = "${aws_s3_bucket.s3_bucket.id}"
  key    = "${var.s3_boyar_key}"

  content      = "${var.boyar_config_source}"
  content_type = "application/json"

  acl = "public-read"
}
