# Setting up an Orbs Private Blockchain Network using Nebula CLI

This step-by-step guide will walk you through creating a network of 3 nodes
and how to perform some basic operations against the brought up network.

This guide assumes you have some basic knowledge regarding Amazon Web Services, ability to run commands within a terminal window and a few other small requirements.

Let's dive in!

I'll keep referring to the word `constellation` through out this document
in Orbs terminology that means a node - similar to an Ethereum node for example.

## Prerequisities

For our tutorial to work properly you should have the following setup:
- Mac or Linux machine
- an SSH public key (which is also loaded by the ssh-agent)
  if you have one set at `~/.ssh/id_rsa.pub` you're good to go!
  you can check this by running the following in your terminal:
  `$ cat ~/.ssh/id_rsa.pub`
- an AWS Credentials profile set correctly 
  See more [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)
- [Node.js](https://nodejs.org/en/) should be installed version 8 or above

### Installing Nebula CLI on your system
Nebula easily integrates into your terminal by installing the NPM package globally

    $ npm install orbs-nebula -g

or if using yarn

    $ yarn global add orbs-nebula

That is all that is required to install Nebula into your system!

### Allocating IPs on Amazon

Since Orbs constellations should have static IPs
In this step you are required to:

- Go into your AWS Console
- Pick our a region or a few regions
- Allocate 3 diferent Elastic IPs

These IPs can be in the same region , each in a different region - It's all the same for the purpose of this example
Whatever you decide to do - bare in mind that you do need to keep track of which IP belongs to each region
(We use the region within our node's configuration JSON so that piece of information is important)

### Clone Nebula's repository

    git clone https://github.com/orbs-network/nebula.git && cd nebula/

### Locate the example files

Once cloned, notice we `cd` into the `nebula` folder. Within this project you should
find a folder called `private`.

This folder contains the required `json` files used to setup our 3 nodes public blockchain network.
within it, you'll find 2 more folders:
- `nodes` - this contains JSON files used in conjunction with Nebula CLI to setup each constellation (Orbs node).
- `templates` - the templates here are used by Nebula to construct a valid network configuration

### Alter the example JSONs to fit your Elastic IPs

The thing to do next is to open up each of the files respectively and update the IPs
according to the IPs that we allocated a few steps back.

So we'll begin by opening up `private/nodes/node1.json` within a text editor and update the following line:

    {
        "name": "node1",
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
        "node1": "NODE1_IP",
        "node2": "NODE2_IP",
        "node3": "NODE3_IP"
    }

Insert the Elastic IPs you assigned for each node into this JSON and save.

Now everything is ready to begin creating the nodes on AWS!

### Run Nebula CLI to create all nodes

Within the same terminal window, run the following command:

    nebula create -f private/nodes/node1.json

This command will output a lot of information verbosely about the node's creation.
Once done, you should be prompted with a text similar to the following:

    Your constellation was created successfully!
    Provided below is the address of your manager node public IP
    The manager IPv4 is: 1.2.3.4

    Your constellation name should be used when wanting to destroy/upgrade
    Constellation name:
    node1

    Example usage:
    nebula destroy --name node1

    Please allow time now for your constellation to finish syncing with the Orbs network
    No further actions required at this point

Repeat the process only changing the name of the JSON file to the next node until all 3 nodes have been created.

### Inspect the network healthiness

At this point we have a network running but we have to verify it's able to reach consensus and close blocks
(This tells us that we can run transactions against it)

To do that, Orbs has developed a special inspection route available on each node that allows to inspect some metrics
of the node. So open up a browser window and navigate to `http://__NODE_IP__:8080/vchains/10000/metrics` replacing __NODE_IP__ with 
one of your node's IP.

The JSON you see will include a property called `BlockStorage.BlockHeight` which indicates the block height that the network is currently on.
Try refreshing this metrics page a couple of times. you should see this value going up between refreshes

If this is the case it means that the network is alive and healthy.