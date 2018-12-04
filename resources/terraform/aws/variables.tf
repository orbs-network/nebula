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
  default = "ewogICJub2RlLXB1YmxpYy1rZXkiOiAiOTJkNDY5ZDdjMDA0Y2MwYjI0YTE5MmQ5NDU3ODM2YmYzOGVmZmEyNzUzNjYyN2VmNjA3MThiMDBiMGYzMzE1MiIsCiAgIm5vZGUtcHJpdmF0ZS1rZXkiOiAiM2IyNGI1ZjllNmIxMzcxYzNiNWRlMmU0MDJhOTY5MzBlZWFmZTUyMTExYmI0YTFiMDAzZTVlY2FkM2ZhYjUzODkyZDQ2OWQ3YzAwNGNjMGIyNGExOTJkOTQ1NzgzNmJmMzhlZmZhMjc1MzY2MjdlZjYwNzE4YjAwYjBmMzMxNTIiLAogICJjb25zdGFudC1jb25zZW5zdXMtbGVhZGVyIjogImRmYzA2YzViZTI0YTY3YWRlZTgwYjM1YWI0ZjE0N2JiMWEzNWM1NWZmODVlZGE2OWY0MGVmODI3YmRkZWMxNzMiCn0="
}
