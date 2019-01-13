#!/bin/bash

echo "Installing Terraform..."
sudo apt-get install unzip
wget https://releases.hashicorp.com/terraform/0.11.10/terraform_0.11.10_linux_amd64.zip
unzip terraform_0.11.10_linux_amd64.zip
sudo mv terraform /usr/local/bin/
terraform --version

echo "Generating SSH key pair"
echo ".ssh directory content before creating the key"
ls -la ~/.ssh
ssh-keygen -b 2048 -t rsa -f ~/.ssh/id_rsa -q -N ""
echo "the directory content after key generation:"
eval `ssh-agent -s`
sleep 1
ssh-add
