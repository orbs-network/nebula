data "aws_availability_zones" "available" {}

module "vpc" {
  source = "./modules/vpc/public-only"

  name           = "${ var.application }-${var.run_identifier}-main-vpc"
  application    = "${ var.application }"
  provisionersrc = "${ var.provisionersrc }"

  azs  = "${ data.aws_availability_zones.available.names }"
  cidr = "${ var.vpc_cidr_block }"
}
