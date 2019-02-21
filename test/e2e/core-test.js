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

// Disabled until everything is fixed
describe('Nebula core', () => {
    it('should provision a new constellation', async () => {
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

        const errornousCreations = results.filter(r => r.ok === false);
        expect(errornousCreations.length).to.equal(0);

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

        // TODO : Make test provision the IPs
        // TODO : Add a contract call before adding the 4th node and another GET call to check the 
        // value exists afterwards and accessible from the 4th node (check syncing)

        expect(currentBlockHeight, "block height should advance with 4th node added").to.be.gte(lastKnownblockHeight + 100);

        await Promise.all([1, 2, 3, 4].map(k => destroy({
            file: `test/e2e/private-network/nodes2/node${k}.json`
        })));
    });

    it.skip('should upgrade the binary version for a constellation', async () => {
        // Create the constellation first
        const constellation = {
            name: "e2e-test-upgrade-binary-version-node",
            awsProfile: "default",
            sshPublicKey: "~/.ssh/id_rsa.pub",
            orbsAddress: "6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9",
            orbsPrivateKey: "426308c4d11a6348a62b4fdfb30e2cad70ab039174e2e8ea707895e4c644c4ec",
            publicIp: "",
            region: "eu-central-1",
            nodeSize: "t2.medium",
            nodeCount: 2,
            configPath: "test/e2e/private-network/templates",
            chainVersion: "v0.8.0"
        };

        const result = await create(constellation).catch(err => err);
        console.log(result);
        expect(result.ok).to.equal(true);

        const publicIp = result.manager.ip;
        const endpoint = `http://${publicIp}/vchains/10000/metrics`;

        console.log('Sleeping after setting up constellation...');
        console.log('since it takes it at least 90 seconds to come up');
        await new Promise((resolve) => setTimeout(resolve, 90 * 1000));
        expect(await harness.eventuallySeeDockerTagInMetrics(endpoint, 'v0.8.0', 60)).to.equal(true);

        const upgradedConstellation = Object.assign({}, constellation, {
            chainVersion: "v0.8.1"
        });

        await update(upgradedConstellation);

        console.log('Sleeping after upgrading the constellation...');
        console.log('since it takes it 60 seconds for Boyar to refresh it\'s configuration');
        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

        expect(await harness.eventuallySeeDockerTagInMetrics(endpoint, 'v0.8.1', 60)).to.equal(true);

        await destroy(upgradedConstellation);
    });
});
