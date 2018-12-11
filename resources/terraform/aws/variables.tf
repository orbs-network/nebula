variable "aws_ami_id" {
  default = "SOME_AMAZON_AMI_ID"
}

variable "aws_orbs_master_instance_type" {
  default = "t2.micro"
}

variable "aws_orbs_slave_instance_type" {
  default = "t2.micro"
}

variable "region" {
  default = "us-east-1"
}

variable "access_key" {
  default = "SOME_AMAZON_ACCESS_KEY"
}

variable "secret_key" {
  default = "SOME_AMAZON_SECRET_KEY"
}

variable "context_id" {}

variable "node_key_pair" {
  default = "e30K"
}
