#!/bin/sh

SWARM_MASTER_IP=$1

# Copy the swarm master generated joining token for slaves over here
echo "Importing join token from swarm master.."
sudo scp -o StrictHostKeyChecking=no -o NoHostAuthenticationForLocalhost=yes -o UserKnownHostsFile=/dev/null -i /home/ubuntu/id_rsa ubuntu@$SWARM_MASTER_IP:/home/ubuntu/token .

# Remove old instances of Docker which might ship with ubuntu
sudo apt-get remove docker docker-engine docker.io

sudo apt-get update
sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
# Complete fingerprint: 9DC8 5822 9FC7 DD38 854A E2D8 8D81 803C 0EBF CD88
sudo apt-key fingerprint 0EBFCD88

sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"

sudo apt-get update
sudo apt-get install -y docker-ce

sudo docker swarm join --token $(cat /home/ubuntu/token) $SWARM_MASTER_IP:2377