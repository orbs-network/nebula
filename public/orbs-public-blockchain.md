# Setting up an Orbs Public Blockchain Node using Nebula CLI

This step-by-step guide will walk you through creating a new node and attaching it to an existing network.

This guide assumes you have some basic knowledge regarding Amazon Web Services, ability to run commands within a terminal window and a few other small requirements.

## Prerequisites

For our tutorial to work properly you should have the following setup:

- Mac or Linux machine
- An SSH public key (by default we use `~/.ssh/id_rsa.pub`). You can generate new one using [GitHub guide](https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/).
- **A clean, new AWS account with admin programmatic access.**
- AWS CLI.
- An AWS credentials profile set correctly:
  See more [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)
- [Node.js](https://nodejs.org/en/) version 8 or above
- Yarn package manager for Node.js
- [Terraform](https://www.terraform.io/downloads.html) from HasiCorp

### Allocating IPs on Amazon

Orbs nodes that you provision have to have static IPs in order to communicate between themselves.

- Go into your AWS Console
- Pick a region (we recommend `ca-central-1`)
- Allocate 1 Elastic IPs

Thies IP will later be used in node configuration.

### Generating public and private keys

**TODO**

### Clone Nebula's repository

Clone git repository

    git clone https://github.com/orbs-network/nebula.git && cd nebula

Install dependencies

    yarn install

### Locate the example files

    cd public

This folder contains the required JSON file used to set up our node.

### Alter the example JSON

The thing to do next is to open up each of the files respectively and update the IPs
according to the IPs that we allocated a few steps back.

So we'll begin by opening up `public/node.json` within a text editor and update the following line:

    {
        "name": "example-public-node1",
        ...
        "publicIp": "$NODE1_IP",
        "region": "$NODE1_REGION",
        ...
    }

Please change `example-public-node1` to something more meaningful, for example, `$COMPANY_NAME-orbs-node`.

### Run Nebula CLI to create all nodes

To create new network:

    ../bin/nebula.js create -f node.json

To destroy the network:

    ../bin/nebula.js destroy -f node.json

Terraform files corresponding to nodes can be found in `~/.nebula/$NODE_NAME`, for example, `~/.nebula/example-public-node1`. We advise to keep these files in source control just in case.

### Inspect the network health

At this point we have a network running but we have to verify it's able to reach consensus and close blocks.

To do that, Orbs has developed a special inspection route available on each node that allows to inspect some metrics
of the node. So open up a browser window and navigate to `http://$NODE_IP/vchains/10000/metrics` replacing __NODE_IP__ with 
one of your node's IPs.

The JSON you see will include a property called `BlockStorage.BlockHeight` which indicates the block height that the network is currently on.
Try refreshing this metrics page a couple of times. you should see this value going up between refreshes

If this is the case it means that the network is alive and healthy.

You can also SSH into the machines using your public key and *ubuntu* username.

## Deploying your first contract

Before we start, modify `orbs-gamma-config.json` by injecting your node IP in the `Endpoints` array in the environment configuration:

```json
{
    "Environments": {
        "private1": {
            "VirtualChain": 10000,
            "Endpoints": ["http://$NODE_IP/vchains/10000"]
        }
    }
}
```

Install gamma-cli:

    brew install gamma-cli

Deploy your first contract:

    gamma-cli deploy contracts/contract.go -name ExampleCounter -env private1

Send transaction:

    gamma-cli send-tx contracts/counter-add.json -signer user1 -env private1

Query contract:

    gamma-cli run-query contracts/counter-get.json -env private1

## Troubleshooting

1. If you get terraform error that your IP does not exist, check if it belongs to the region where you are trying to provision the node (`private/nodes/node1.json`) for `example-node1` and so on.

2. If new blocks aren't being created, the most basic problem that we might face is communication issue. Please verify that all nodes are accessible from each other. You can find configuration of virtual chains in `private/templates/boyar.json`. By default, the nodes should be able to access each other via port `4400`.

3. You can further investigate Terraform files in `~/.nebula` and manually alter sources for these files in `resources/terraform/aws` to your liking. However, we would advise against it.

4. If you are manually running Terraform, don't forget to detach your node IP from state so it wouldn't be released: `terraform state rm aws_eip.eip_manager`.

5. If you are trying to destroy all blocks history, you have to manually removed all volumes with names `orbs-network-chain-*`.

6. Contact the authors of this guide.

### Known bugs

- `nodeCount` that is not equal `2` is *not supported* (Docker Swarm cluster can only have 2 workers at the moment).
- running multiple nodes in the same region with the same virtual chain id is not supported at the moment, so it's a requirement to place your nodes in different AWS regions.
