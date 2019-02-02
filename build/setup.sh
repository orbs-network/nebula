#!/bin/bash

echo "Installing Terraform..."
sudo apt-get install unzip
wget https://releases.hashicorp.com/terraform/0.11.10/terraform_0.11.10_linux_amd64.zip
unzip terraform_0.11.10_linux_amd64.zip
sudo mv terraform /usr/local/bin/
terraform --version

sudo mkdir -p ~/.aws
echo "[default]
aws_access_key_id=$AWS_ACCESS_KEY_ID
aws_secret_access_key=$AWS_SECRET_ACCESS_KEY
" > ~/.aws/credentials

echo "Generating SSH key pair"
echo ".ssh directory content before creating the key"
rm -f ~/.ssh/id_rsa
ls -la ~/.ssh
ssh-keygen -b 2048 -t rsa -f ~/.ssh/id_rsa -q -N ""
echo "the directory content after key generation:"
ls -la ~/.ssh
eval `ssh-agent -s`
sleep 1
ssh-add
