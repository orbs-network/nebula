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

variable "instance_type" {
  default = "m4.xlarge"
}

variable "name" {
  default = ""
}

variable "instance_count" {
  default = 2
}

variable "region" {
  default = "us-east-1"
}

variable "aws_profile" {}

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

variable "ethereum_topology_contract_address" {
  default = ""
}

variable "ethereum_endpoint" {
  default = ""
}

variable "boyar_version" {
  default = "ae4a501b84bd4c6971233f64dff1727384b83676"
}

variable "incoming_ssh_cidr_blocks" {
  default = []
  type = "list"
}
