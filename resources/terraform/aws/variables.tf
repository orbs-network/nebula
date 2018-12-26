variable "application" {
  default = "orbs-network-constellation"
}

variable "provisionersrc" {
  default = "orbs-network/nebula"
}

variable "vpc_cidr_block" {
  description = "The VPC CIDR address range"

  #https://docs.docker.com/docker-for-aws/faqs/#recommended-vpc-and-subnet-setup
  default = "172.31.0.0/16"
}

variable "aws_ether_instance_type" {}

variable "run_identifier" {
  default = ""
}

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

variable "boyar_config_source" {
  default = "e30K"
}

variable "s3_bucket_name" {}

variable "s3_boyar_key" {}

variable "s3_boyar_config_url" {}

variable "path_to_ssh_pubkey" {}
