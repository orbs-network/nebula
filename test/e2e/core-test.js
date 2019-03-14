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
const _ = require("lodash");

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
        const region = 'sa-east-1';
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


