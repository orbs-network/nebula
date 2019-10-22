# Orbs node debugging manual

This is a series of tests that can be performed on a live system (or its configuration files) to triangulate the problems that might arise during or after the node deployment.

In this document, `redeploy the node` means destroying the node via `nebula destroy` command and creating it again via `nebula create` command as described [here](README.md).

## Example `node.json` file

```json
    {
        "name": "$VALIDATOR_NAME-orbs-prod",
        "awsProfile": "default",
        "sshPublicKey": "$LOCATION_TO_PUB_FILE",
        "orbsAddress": "$ORBS_PUBLIC_NODE_ADDRESS",
        "publicIp": "$NODE_AWS_IP",
        "region": "$NODE_AWS_REGION",
        "nodeSize": "m4.xlarge",
        "nodeCount": 0,
        "bootstrapUrl": "https://s3.amazonaws.com/orbs-bootstrap-prod/boyar/config.json",
        "ethereumChain": "mainnet",
        "ethereumTopologyContractAddress": "0x804c8336846d8206c95CEe24752D514210B5a240",
        "cachePath": "./_terraform",
        "ethereumEndpoint": "$ETHEREUM_NODE_ADDRESS",
        "incomingSshCidrBlocks": ["$YOUR_OFFICE_IP/32"]
    }
```

## `nebula create` errors

### Terraform errors

Please, **never** run terraform using the files produced by Nebula. The reason for it is simple: Nebula manages all the credentials (for example, node private key) and Terraform state (Elastic IP attachment), and running Terraform without Nebula will have unintended consequences.

#### `Error downloading modules: Error loading modules: module vpc`

You need to update your Terraform version.

#### `Error creating S3 bucket: BucketAlreadyOwnedByYou: Your previous request to create the named bucket succeeded and you already own it`

You have leftover S3 bucket from your previous node. You have three options:

* run `nebula destroy` if you have kept original terraform files
* remove all leftover resources manually via AWS console
* change `name` field value in `node.json`. Adding a digit in the end of the name should help.

#### `Error launching source instance: PendingVerification: Your request for accessing resources in this region is being validated, and you will not be able to launch additional resources in this region until the validation is complete`

You have to wait for AWS to complete the verification process for your account. It usually does not take long and you will be notified by email.

## Live node errors

### SSH access

`sshPublicKey` field of `node.json` contains path to the public key. Usually the private key is right next to it.

* `ssh-add $PATH_TO_PRIVATE_KEY` will enable the private key
* check the username that you use to connect to the node: `ssh ubuntu@$NODE_IP`

If you experience timeout, check `incomingSshCidrBlocks` field of `node.json`, maybe your IP address is not there. `0.0.0.0/0` includes all possible IP addresses but **this value is not recommended for production use**. Keep the list short for the sake of security.

* add your IP address to the list of allowed IP addresses
* redeploy the node

### Bad Gateway while trying to access a virtual chain

In production, we have a virtual chain 1100000 which can be accessed via `http://$NODE_IP/vchains/1100000/metrics` page. It could take some time before the virtual chain is launched, so it may be a good idea to wait for 5-10 minutes and try to access the metrics page again.

If waiting didn't help and you still get Bad Gateway error, there are multiple things that could have gone wrong. First, you have to **ssh into your node** and run `sudo su`.

#### Docker services

`docker service ls` will give you a list of services on the node:

```
ID                  NAME                               MODE                REPLICAS            IMAGE                     PORTS
acl45kiuwdg2        http-api-reverse-proxy-stack       replicated          1/1                 nginx:latest              *:80->80/tcp
doxb3p6nwif7        orbs-network-chain-5110-stack      replicated          1/1                 orbsnetwork/node:v1.2.2   *:4005->4400/tcp, *:8005->8080/tcp
szy9v9xvl7uo        orbs-network-chain-1000001-stack   replicated          1/1                 orbsnetwork/node:v1.2.2   *:4001->4400/tcp, *:8001->8080/tcp
cztr4evl331k        orbs-network-chain-1100000-stack   replicated          1/1                 orbsnetwork/node:v1.2.2   *:4003->4400/tcp, *:8002->8080/tcp
ox7q2mjt3ors        orbs-network-chain-1660000-stack   replicated          1/1                 orbsnetwork/node:v1.2.2   *:4006->4400/tcp, *:8006->8080/tcp
2j68481iamqg        orbs-network-chain-1960000-stack   replicated          1/1                 orbsnetwork/node:v1.2.2   *:4007->4400/tcp, *:8007->8080/tcp
```

If any of the services are unreplicated, there might be a problem.

#### Looking at bootstrap script

If you do not have access to the `docker` command, the node might be still booting. You can check its progress in `/var/log/cloud-init.log` and `/var/log/cloud-init-output.log`.

The bootstrap script itself can be found here: `cat $(find /var -name part-001)`

#### Looking at `boyar.log`

All the services are provisioned by [Boyar](https://github.com/netoneko/boyar). Boyar log is stored at `/var/log/boyar.log`.

The log contains the following things:

* boostrap process of every vchain
* status of every docker service that is currently live, including errors

If you can't find any errors in the log, it might be helpful to look at the docker services directly: `docker service ps $(docker service ls -q) --no-trunc`.

#### `requireNonEmptyPeerMap` error

If your virtual chain keeps crashing with this error, it means that it has no peers. Peers configuration comes from Ethereum network. To fix the issue:

* update `ethereumEndpoint` field of `node.json` with value `http://eth.orbs.com` or a URL of your own Ethereum node
* redeploy the node

#### `starting container failed: error while mounting volume`

It means that [RexRay](https://github.com/rexray/rexray) docker plugin that we use to mount EBS volumes has failed to attach them to the instance. Using AWS Console, please check that:

* the EBS volumes in question (their names ending with `-logs` and `-blocks`) are not attached to anything else (old servers, etc)
* if they are attached to something, they should be forcibly detached so they could be mounted by the node

EBS volumes might sometimes fail to be mounted and you might choose to either wait for them to become available or redeploy the node.
