# Backend configuration is loaded early so we can't use variables
terraform {
  backend "s3" {
    region  = "__region__"
    bucket  = "__name__"
    key     = "state.tfstate"
    encrypt = true                   #AES-256 encryption
  }
}
