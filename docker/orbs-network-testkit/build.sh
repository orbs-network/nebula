#!/bin/bash -e

echo "Building Docker image for orbs-network-go testkit"

docker build -t itamararjuan/orbs-network-go:testkit .

docker push itamararjuan/orbs-network-go:testkit