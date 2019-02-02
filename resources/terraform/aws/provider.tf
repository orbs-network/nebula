/* Setup our aws provider */
provider "aws" {
  region  = "${var.region}"
  profile = "${var.aws_profile}"
}
