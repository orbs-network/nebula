const { describe, it } = require('mocha');
const { expect } = require('chai');

const types = require('./../../constants/types');
const { CoreService } = require('./../../lib/services/core/core');
const { TerraformService } = require('./../../lib/services/terraform/terraform');
const terraformProdAdapter = require('./../../lib/adapters/terraform/adapter');
const { coreAdapter } = require('../../lib/adapters/core/adapter');
const harness = require('./harness');
const path = require('path');
const { waitUntilSync, getBlockHeight } = require('./../../deploy');

const boyarConfig = require('./../../testnet/boyar');
const cachePathForTests = path.join(__dirname, '../../../_terraform');
const { create, destroy, update } = require('./../../lib/cli/cli');

const c = new CoreService(new TerraformService(terraformProdAdapter, cachePathForTests), coreAdapter);

const accessKey = process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = 'us-east-2';
const ethereumAZ = 'us-east-2b';
const bucketPrefix = 'boyar-discovery';

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

describe('Nebula core', () => {
    it('should provision a new constellation with a pre-existing EBS for ethereum persistency kept between destructions', async () => {
        // First we will create an Elastic IP outside the scope of createConstellation()
        const { preExistingElasticIp } = await harness.createStandAloneIPAndVolume({
            accessKey, secretKey, region, ethereumAZ
        });

        const cloud = {
            type: types.clouds.aws,
            region,
            instanceType: 't2.medium',
            nodeCount: 2,
            bucketPrefix,
            ip: preExistingElasticIp,
        };

        const result = await c.createConstellation({ cloud, keys });
        expect(result.ok).to.equal(true);

        const pollingResult = await harness.eventuallyReady(preExistingElasticIp);
        expect(pollingResult).to.equal(true);

        const destroyResult = await c.destroyConstellation({ spinContext: result.spinContext });
        expect(destroyResult.error).to.equal(null);
        expect(destroyResult.ok).to.equal(true);

        const standAlonePlanOutputAsString = await harness.checkPlanForStandAloneIPAndVolume();
        const desiredMessageIndex = standAlonePlanOutputAsString.indexOf('No changes. Infrastructure is up-to-date');
        expect(desiredMessageIndex, 'Expecting to see the IP is still alive after destroying infra').to.not.equal(-1);

        await harness.destroyStandAloneInfra();
    });

    it.only('should provision a whole private blockchain from the private folder', async () => {
        const endpoint = '52.57.222.178/vchains/10000';

        const creations = [1, 2, 3].map(k => create({
            file: `test/e2e/private-network/nodes/node${k}.json`
        }).catch(err => err));

        const results = await Promise.all(creations);

        // Wait for the network to sync correctly
        await waitUntilSync(endpoint, 10);
        const blockHeight = await getBlockHeight(endpoint);

        expect(blockHeight, "block height should advance").to.be.gte(10);

        // at this stage we have a running network of 3 nodes able to close blocks
        // Now we will add a 4th node to the network and update the network configuration
        // for the existing 3 nodes

        const resultNode4 = await create({ file: 'test/e2e/private-network/nodes2/node4.json' })
            .catch(err => err);

        expect(resultNode4.ok).to.equal(true);

        const endpoint4thNode = '52.47.127.65/vchains/10000';

        // TODO: check that update was successful on all nodes
        const updateResults = await Promise.all([1, 2, 3].map(k => update({
            file: `test/e2e/private-network/nodes2/node${k}.json`
        }).catch(err => err)));

        const lastKnownblockHeight = await getBlockHeight(endpoint);

        await waitUntilSync(endpoint4thNode, lastKnownblockHeight + 100);
        const currentBlockHeight = await getBlockHeight(endpoint4thNode);

        expect(currentBlockHeight, "block height should advance with 4th node added").to.be.gte(lastKnownblockHeight + 100);

        await Promise.all([1, 2, 3, 4].map(k => destroy({
            file: `test/e2e/private-network/nodes2/node${k}.json`
        })));
    });
});
