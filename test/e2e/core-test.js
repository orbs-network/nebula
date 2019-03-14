const {
    describe,
    it
} = require('mocha');
const {
    expect
} = require('chai');

const types = require('./../../constants/types');
const {
    CoreService
} = require('./../../lib/services/core/core');
const {
    TerraformService
} = require('./../../lib/services/terraform/terraform');
const terraformProdAdapter = require('./../../lib/adapters/terraform/adapter');
const {
    coreAdapter
} = require('../../lib/adapters/core/adapter');
const harness = require('./harness');
const path = require('path');
const {
    waitUntilSync,
    waitUntilVersion,
    getBlockHeight,
    getVersion
} = require('./../../lib/metrics');

const cachePathForTests = path.join(__dirname, '../../../_terraform');
const {
    create,
    destroy,
    update
} = require('./../../lib/cli/cli');

const fs = require("fs");

const AWS = require("aws-sdk");

const _ = require("lodash");
const Promise = require("bluebird");

const BOYAR_CONFIG_TEMPLATE = {
    "network": [],
    "orchestrator": {},
    "chains": [{
        "Id": 10000,
        "HttpPort": 8080,
        "GossipPort": 4400,
        "DockerConfig": {
            "ContainerNamePrefix": "orbs-network",
            "Image": "orbsnetwork/node",
            "Tag": "v0.8.0",
            "Pull": true
        },
        "Config": {
            "ethereum-endpoint": "http://172.31.1.100:8545",
            "logger-file-truncation-interval": "15m",
            "profiling": true
        }
    },
    {
        "Id": 20000,
        "HttpPort": 8081,
        "GossipPort": 4401,
        "DockerConfig": {
            "ContainerNamePrefix": "orbs-network",
            "Image": "orbsnetwork/node",
            "Tag": "v0.8.0",
            "Pull": true
        },
        "Config": {
            "ethereum-endpoint": "http://172.31.1.100:8545",
            "logger-file-truncation-interval": "15m",
            "profiling": true
        }
    },
    {
        "Id": 30000,
        "HttpPort": 8082,
        "GossipPort": 4402,
        "DockerConfig": {
            "ContainerNamePrefix": "orbs-network",
            "Image": "orbsnetwork/node",
            "Tag": "v0.8.0",
            "Pull": true
        },
        "Config": {
            "ethereum-endpoint": "http://172.31.1.100:8545",
            "logger-file-truncation-interval": "15m",
            "profiling": true
        }
    }
    ]
}


const NODES_TEMPLATE = [{
    "name": "e2e-test-node1",
    "sshPublicKey": "~/.ssh/id_rsa.pub",
    "awsProfile": "default",
    "orbsAddress": "6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9",
    "orbsPrivateKey": "426308c4d11a6348a62b4fdfb30e2cad70ab039174e2e8ea707895e4c644c4ec",
    "publicIp": "",
    "region": "eu-central-1",
    "nodeSize": "t2.medium",
    "nodeCount": 2,
    "configPath": `${__dirname}/private-network/templates/`,
    "chainVersion": "v0.8.0"
},
{
    "name": "e2e-test-node2",
    "sshPublicKey": "~/.ssh/id_rsa.pub",
    "awsProfile": "default",
    "orbsAddress": "d27e2e7398e2582f63d0800330010b3e58952ff6",
    "orbsPrivateKey": "87a210586f57890ae3642c62ceb58f0f0a54e787891054a5a54c80e1da418253",
    "publicIp": "",
    "region": "eu-west-1",
    "nodeSize": "t2.medium",
    "nodeCount": 2,
    "configPath": `${__dirname}/private-network/templates/`,
    "chainVersion": "v0.8.0"
},
{
    "name": "e2e-test-node3",
    "sshPublicKey": "~/.ssh/id_rsa.pub",
    "awsProfile": "default",
    "orbsAddress": "a328846cd5b4979d68a8c58a9bdfeee657b34de7",
    "orbsPrivateKey": "901a1a0bfbe217593062a054e561e708707cb814a123474c25fd567a0fe088f8",
    "publicIp": "",
    "region": "eu-west-2",
    "nodeSize": "t2.medium",
    "nodeCount": 2,
    "configPath": `${__dirname}/private-network/templates/`,
    "chainVersion": "v0.8.0"
},
{
    "name": "e2e-test-node4",
    "sshPublicKey": "~/.ssh/id_rsa.pub",
    "awsProfile": "default",
    "orbsAddress": "c056dfc0d1fbc7479db11e61d1b0b57612bf7f17",
    "orbsPrivateKey": "1e404ba4e421cedf58dcc3dddcee656569afc7904e209612f7de93e1ad710300",
    "publicIp": "",
    "region": "eu-west-3",
    "nodeSize": "t2.medium",
    "nodeCount": 2,
    "configPath": `${__dirname}/private-network/templates/`,
    "chainVersion": "v0.8.0"
}
]

async function getPublicIp(region) {
    const ec2 = new AWS.EC2({
        region
    });
    const response = await ec2.allocateAddress({
        Domain: "vpc"
    }).promise();
    return response.PublicIp;
}

async function destroyPublicIp(region, ip) {
    console.log(`Destroying ${ip} in ${region}`);

    const ec2 = new AWS.EC2({
        region
    });
    const description = await ec2.describeAddresses({
        PublicIps: [ip],
    }).promise();

    return ec2.releaseAddress({
        AllocationId: description.Addresses[0].AllocationId
    }).promise();
}

async function getNodes() {
    return Promise.all(_.map(NODES_TEMPLATE, async (template) => {
        return _.merge(template, {
            publicIp: await getPublicIp(template.region)
        });
    }));
}

function generateIpsConfig(nodes) {
    return _.reduce(nodes, (result, node) => {
        return _.merge(result, {
            [node.name]: node.publicIp
        });
    }, {});
}

function generateKeysConfig(nodes) {
    return _.reduce(nodes, (result, node) => {
        return _.merge(result, {
            [node.name]: {
                address: node.orbsAddress,
            }
        });
    }, {});
}

function saveConfig(nodes) {
    fs.writeFileSync(`${__dirname}/private-network/templates/boyar.json`, JSON.stringify(BOYAR_CONFIG_TEMPLATE, 2, 2));
    fs.writeFileSync(`${__dirname}/private-network/templates/ips.json`, JSON.stringify(generateIpsConfig(nodes), 2, 2));
    fs.writeFileSync(`${__dirname}/private-network/templates/keys.json`, JSON.stringify(generateKeysConfig(nodes), 2, 2));
}

describe('Nebula core', () => {
    it('should provision a new constellation', async () => {
        const region = 'eu-north-1';
        const bucketPrefix = 'boyar-discovery';
        
        const c = new CoreService(new TerraformService(terraformProdAdapter, cachePathForTests), coreAdapter);

        const boyarConfig = require('./../../testnet/boyar');
        const keys = {
            aws: {
                profile: 'default',
            },
            ssh: {
                path: '~/.ssh/id_rsa.pub',
            },
            orbs: {
                nodeKeys: {
                    address: "d27e2e7398e2582f63d0800330010b3e58952ff6",
                    privateKey: "87a210586f57890ae3642c62ceb58f0f0a54e787891054a5a54c80e1da418253",
                    leader: "a328846cd5b4979d68a8c58a9bdfeee657b34de7",
                },
                boyarConfig,
                ethereum: true
            }
        };

        // First we will create an Elastic IP outside the scope of createConstellation()
        const preExistingElasticIp = await getPublicIp(region);

        const cloud = {
            type: types.clouds.aws,
            region,
            instanceType: 't2.medium',
            nodeCount: 2,
            bucketPrefix,
            ip: preExistingElasticIp,
        };

        const result = await c.createConstellation({
            cloud,
            keys
        });
        expect(result.ok).to.equal(true);

        const pollingResult = await harness.eventuallyReady(preExistingElasticIp);
        expect(pollingResult).to.equal(true);

        const destroyResult = await c.destroyConstellation({
            spinContext: result.spinContext
        });
        expect(destroyResult.error).to.equal(null);
        expect(destroyResult.ok).to.equal(true);

        await destroyPublicIp(region, preExistingElasticIp);
    });

    it('should provision a whole private blockchain from the private folder', async () => {
        const nodes = await getNodes();
        const _3_nodes = _.take(nodes, 3);
        const lastNode = _.last(nodes);

        try {
            saveConfig(_3_nodes);

            const firstEndpoint = `${_3_nodes[0].publicIp}/vchains/10000`;

            const creations = _.map(_3_nodes, (node) => create(node).catch(err => err));
            const results = await Promise.all(creations);

            const errornousCreations = results.filter(r => r.ok === false);
            expect(errornousCreations.length).to.equal(0);

            // Wait for the network to sync correctly
            await waitUntilSync(firstEndpoint, 10);
            const blockHeight = await getBlockHeight(firstEndpoint);

            expect(blockHeight, "block height should advance").to.be.gte(10);

            // at this stage we have a running network of 3 nodes able to close blocks
            // Now we will add a 4th node to the network and update the network configuration
            // for the existing 3 nodes

            saveConfig(nodes);

            const resultNode4 = await create(lastNode).catch(err => err);
            expect(resultNode4.ok).to.equal(true);

            const lastEndpoint = `${lastNode.publicIp}/vchains/10000`;

            // TODO: check that update was successful on all nodes
            const updateResults = await Promise.all(_.map(_3_nodes, (node) => update(node).catch(err => err)));
            const successfulUpdates = updateResults.filter(r => r.ok === true);
            expect(successfulUpdates.length, 'Expect all 3 updates to work correctly').to.equal(3);

            // wait until the last node had synced with others
            await waitUntilSync(lastEndpoint, 30);

            // check again that the first node keeps advancing too
            const firstNodeBlockHeight = await getBlockHeight(firstEndpoint);
            expect(firstNodeBlockHeight, "block height should advance with 4th node added").to.be.gte(30);

            // check again that the last node advances, not just syncs
            await waitUntilSync(lastEndpoint, firstNodeBlockHeight + 10);

            const lastNodeBlockHeight = await getBlockHeight(lastEndpoint);
            expect(lastNodeBlockHeight, "block height should advance with 4th node added").to.be.gte(firstNodeBlockHeight + 10);

            // TODO: Add a contract call before adding the 4th node and another GET call to check the
            // value exists afterwards and accessible from the 4th node (check syncing)
        } finally {
            await Promise.all(_.map(nodes, (node) => destroy(node).catch(err => err)));

            await Promise.all(_.map(nodes, (node) => {
                return destroyPublicIp(node.region, node.publicIp);
            }));
        }
    });

    it('should upgrade the binary version for a constellation', async () => {
        const singleNode = NODES_TEMPLATE[0];
        singleNode.publicIp = await getPublicIp(singleNode.region);

        try {
            saveConfig([singleNode]);

            const endpoint = `${singleNode.publicIp}/vchains/10000`;
            await create(singleNode);

            // This is a known bug, the binary from the tag v0.8.0 will still report an old version
            await waitUntilVersion(endpoint, "v0.7.0");
            const version = await getVersion(endpoint);
            expect(version, "versions should match").to.be.eql("v0.7.0");

            const upgradedNode = _.merge({}, singleNode, {
                chainVersion: "v0.8.1"
            });
            update(upgradedNode);

            await waitUntilVersion(endpoint, "v0.8.1");
            const currentVersion = await getVersion(endpoint);
            expect(currentVersion, "versions should match").to.be.eql("v0.8.1");
        } finally {
            await destroy(singleNode);
            await destroyPublicIp(singleNode.region, singleNode.publicIp);
        }
    });
});
