# Setting up an Orbs Private Blockchain Network using Nebula CLI

This step-by-step guide will walk you through creating a network of 3 nodes
and how to perform some basic operations against the brought up network.

This guide assumes you have some basic knowledge regarding Amazon Web Services, ability to run commands within a terminal window and a few other small requirements.

## Prerequisites

For our tutorial to work properly you should have the following setup:

- Mac or Linux machine
- An SSH public key (which is also loaded by the ssh-agent)
  If you have one set at `~/.ssh/id_rsa.pub` you're good to go!
  You can check this by running the following in your terminal:
  `$ cat ~/.ssh/id_rsa.pub`
- An AWS credentials profile set correctly:
  See more [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)
- [Node.js](https://nodejs.org/en/) version 8 or above

### Allocating IPs on Amazon

Orbs nodes that you provision have to have static IPs in order to communicate between themselves.

- Go into your AWS Console
- Pick 3 different regions (we recommend `us-east-1`, `us-west-2` and `ca-central-1`)
- Allocate 3 diferent Elastic IPs, one per region

These IPs will later be used in node configuration.

### Clone Nebula's repository

    git clone https://github.com/orbs-network/nebula.git && cd nebula/ && yarn install

### Locate the example files

    cd private

This folder contains the required JSON files used to set up our 3 nodes public blockchain network.

Within it, you'll find 2 more folders:

- `nodes` - this contains JSON files used in conjunction with Nebula CLI to setup each constellation (Orbs node).
- `templates` - the templates here are used by Nebula to construct a valid network configuration

### Alter the example JSONs to fit your Elastic IPs

The thing to do next is to open up each of the files respectively and update the IPs
according to the IPs that we allocated a few steps back.

So we'll begin by opening up `private/nodes/node1.json` within a text editor and update the following line:

    {
        "name": "example-node1",
        ...
        "publicIp": "NODE1_IP",
        "region": "NODE1_REGION",
        ...
    }

You can then update the contents of these fields with the Elastic IP you have allocated + it's region
Repeat the process for `node2` and `node3`

Next up we need to update `private/templates/ips.json` to which holds the entire topology of IPs all together.
`ips.json` looks like so:

    {
        "example-node1": "NODE1_IP",
        "example-node2": "NODE2_IP",
        "example-node3": "NODE3_IP"
    }

Please notice that the name here is the same value as `name` field in `nodes/node1.json`.

### Run Nebula CLI to create all nodes

To create new network:

    ./create.sh

To destroy the network:

    ./destroy.sh

Terraform files corresponding to nodes can be found in `~/.nebula/$NODE_NAME`, for example, `~/.nebula/example-node1`. We advise to keep these files in source control just in case.

### Inspect the network health

At this point we have a network running but we have to verify it's able to reach consensus and close blocks.

To do that, Orbs has developed a special inspection route available on each node that allows to inspect some metrics
of the node. So open up a browser window and navigate to `http://__NODE_IP__:8080/vchains/10000/metrics` replacing __NODE_IP__ with 
one of your node's IPs.

The JSON you see will include a property called `BlockStorage.BlockHeight` which indicates the block height that the network is currently on.
Try refreshing this metrics page a couple of times. you should see this value going up between refreshes

If this is the case it means that the network is alive and healthy.

You can also SSH into the machines using your public key and *ubuntu* username.
