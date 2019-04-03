# Setting up an Orbs Public Blockchain Node using Nebula CLI

This step-by-step guide will walk you through creating a new node and connecting it to an existing Orbs network.

![](../diagram.png)

## Prerequisites

To complete this guide you will need the following set up:

- Mac or Linux machine
- An SSH public key (by default we use `~/.ssh/id_rsa.pub`). We go into details on how to generate it below
- **A clean, new AWS account with admin programmatic access.**
- AWS CLI
  
  Use `brew install awscli` to get it installed
- An AWS credentials profile set correctly:
  
  See more [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)
  
  We require the `aws_access_key_id` and `aws_secret_access_key` of an admin account for our Terraform script to execute correctly 
- [Node.js](https://nodejs.org/en/) version 8 or above
  
  Use `brew install node` to get it installed

- [Terraform](https://www.terraform.io/downloads.html) from HasiCorp
  
  Use `brew install terraform` to get it installed
- [Orbs Key Generator](https://www.github.com/orbs-network/orbs-key-generator)

  Use `brew install orbs-network/devtools/orbs-key-generator` to get it installed (requires a Mac)

### Generating SSH public and private keys

We require a valid public/private keys to run our deployment scripts and set up the EC2 resources. The key file should remain secret with the exception of feeding it to the configuration during setup. (providing the path for the pub file in the `orbs-node.json` setup file as described below)

The generated key should __not__ have a passphrase.
It is okay to generate a key by any means, such as based on the following tutorial by [GitHub](https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/)

The gist of creating such a key is running:

    ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

### Allocating an IP on Amazon

The Orbs node that you provision must have a static IPs in order to communicate with the network.

- Go to your AWS Console
- Pick a region (for example `ca-central-1`)
- Allocate 1 Elastic IPs

That IP address and region will later be used in the node configuration file.


### Generating Orbs addresses

An Orbs node is identified by a public key and any action of the node should be signed with the corresponding private key. 
These keys should be generated in a secure fashion and the private key should be securely stored. 

We require an Orbs private key and an Orbs address. These can be generated using the [Orbs key generator](https://github.com/orbs-network/orbs-key-generator) by running `orbs-key-generator node`

The output of the key generator should be securely stored and used in the `orbs-node.json` configuration file and node deployment command as explained below. You will need the `NodeAddress` and `NodePrivateKey` later on __without the leading 0x__.

### Install Nebula via NPM

To install Nebula run

    npm install -g orbs-nebula

If you have previously installed Nebula and you are performing a new deploy, we recommend updating it by running `npm update -g orbs-nebula`

__Your Nebula version should be 1.1.2 or higher__ (you can run `npm list -g orbs-nebula` to check your version)

### Configure the boilerplate JSON file

The thing to do next is to create the `orbs-node.json` file and configure it as required for the new node.

The content of the `orbs-node.json` should be:

    {
        "name": "$VALIDATOR_NAME-orbs-prod",
        "awsProfile": "default",
        "sshPublicKey": "$LOCATION_TO_PUB_FILE",
        "orbsAddress": "$ORBS_PUBLIC_NODE_ADDRESS",
        "publicIp": "$NODE_AWS_IP",
        "region": "$NODE_AWS_REGION",
        "nodeSize": "m4.xlarge",
        "nodeCount": 2,
        "bootstrapUrl": "https://s3.amazonaws.com/orbs-bootstrap-prod/boyar/config.json",
        "ethereumChain": "mainnet",
        "ethereumTopologyContractAddress": "0x804c8336846d8206c95CEe24752D514210B5a240",
        "cachePath": "./_terraform",
        "ethereumEndpoint": "$ETHEREUM_NODE_ADDRESS",
        "incomingSshCidrBlocks": ["$YOUR_OFFICE_IP/32"]
    }

You will need:
* $VALIDATOR_NAME-orbs-node - Name for your Validator name, such as a company name or brand name.
* $LOCATION_TO_PUB_FILE - The SSH public and private key file path (the generated pub file)
* $ORBS_PUBLIC_NODE_ADDRESS - The Orbs node address (from the Orbs key generator - __without the leading 0x__)
* $NODE_AWS_IP - The IP address (from AWS)
* $NODE_AWS_REGION - The AWS region (from AWS)
* $ETHEREUM_NODE_ADDRESS - this parameter is _optional_, used to configure an external Ethereum node. If the parameter is not included, an internal Ethereum node will be used. If you have your own synced Ethereum node, you can use it as a value for ethereumEndpoint. Alternatively, you can use "http://eth.orbs.com" , which we provide for your convenience (configure it by writing "ethereumEndpoint": "http://eth.orbs.com"). Our long term goal is to use the Ethereum node that is internal to the Orbs node. 
* $YOUR_OFFICE_IP - This is the IP address/range that we will grant access to for ssh connections to the node, you will still need the public key to connect - it is required only in cases of troubleshooting. The format is standard CIDR so a range may be provided by changing the mask. Any IP not in the range will not be able to SSH to the node, even if it has the SSH key file.

Other parameters (no need to change them):

The `cachePath` configuration tells nebula where to store the terraform installation meta-data created during the deploy stage. It is required in cases where you wish to remove the node from AWS. You should store these files and back them up so you can run maintenance if required.

The `awsProfile` configuration can be changed if you are using multiple aws configurations and want a specific one to be applied.

### Run Nebula CLI to deploy the node

To avoid having the orbs node private key as part of your command history, we recommend creating a file called `orbs-private-key.txt` and put the orbs node private key inside it, __without the leading 0x__.
That key was generated by the key generator and should be in a hex string of size 64 characters, like `f5f83Ee70a85fFF2exxxxxxxxxxxxxxxxxxxxxxxxxxx334932F34C8D629165Ed`.

To provision the resources required for the node:

    nebula create -f orbs-node.json --orbs-private-key $(cat path/to/orbs-private-key.txt)

Terraform files corresponding to nodes can be found in the folder defined in `cachePath` and should be backed up.

If needed, the command to remove all resources provisioned for the node is:
           
    nebula destroy -f orbs-node.json
    
### IMPORTANT! ###
After deployment make sure to backup and securely store - 
1. __Orbs keys__ (and any other credentials you used and configured, such as SSH keys)
2. __`_terraform` folder contents__ - these are required to destroy or redeploy the node
3. The __`orbs-node.json`__ file

### Registering to the Orbs public network

In order to register on the network, please follow [the Validator Registration process](https://github.com/orbs-network/orbs-ethereum-contracts/blob/master/voting/ethereum/instructions/validator_registration.md)

Contact Orbs after registration is done.


### What happens after deployment

Once the deployment finishes, the node goes through several stages:
1. First it will wait for the Ethereum node to finish syncing - this can take several hours and until that is done, the node will not be operational
2. It will then bootstrap the initial network configuration.
3. It will retrieve the network topology from an Ethereum contract to learn who are its other peers and connect to them.

At that point if everything passes and the node is part of the topology, it will start syncing with other nodes.

### How to inspect the network health

Now, your node has joined the network and should be syncing the existing blocks.

To inspect your node operation on every virtual chain, Orbs has developed a special inspection route available on each node that provides access to node metrics.
To access the metrics, navigate to `http://$NODE_IP/vchains/1100000/metrics` replacing __$NODE_IP__ with 
your node IP.

You node will not be able to respond to any requests until its Ethereum node finished syncing - this can take several hours from deploy.

The JSON you see will include a property called `BlockStorage.BlockHeight`, which indicates the block height that the network is currently on.
Try refreshing this metrics page a couple of times, you should see this value increasing.

If this is the case it means that the network is alive and healthy. 

__Congratulations!__

## Troubleshooting

1. If you get an Terraform error that your IP does not exist, check whether the combination of ip and region is correct in the node configuration file (`orbs-node.json`)

2. If the metrics page does not respond, it could be that the Ethereum node did not finish syncing - this takes several hours.

3. If you are having trouble with Ethereum node, add `"ethereumEndpoint": "http://eth.orbs.com"` to your `node.json` and redeploy the node (`nebula destroy` and then `nebula create` as usual). If you have your own synced Ethereum node, you can use it as a value for `ethereumEndpoint`. We only provide `eth.orbs.com` for your convenience. Our long term goal is to use the Ethereum node that belongs to the Orbs node.

4. Contact Orbs for any other issues
