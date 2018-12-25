const { describe, it } = require('mocha');
const { expect } = require('chai');

const types = require('./../../constants/types');
const { CoreService } = require('./../../lib/services/core/core');
const { TerraformService } = require('./../../lib/services/terraform/terraform');
const terraformProdAdapter = require('./../../lib/adapters/terraform/adapter');
const { coreAdapter } = require('../../lib/adapters/core/adapter');
const testUtils = require('./test.utils');

const boyarConfig = require('./../../testnet/boyar');

const c = new CoreService(new TerraformService(terraformProdAdapter), coreAdapter);

const accessKey = process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = 'us-east-2';
const ethereumAZ = 'us-east-2b';

const keys = {
    aws: {
        accessKey,
        secretKey,
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
    }
};

describe('Nebula core', () => {
    it.only('should provision a new constellation with existing ethereum volume and destroy it', async () => {
        const { ethereumEbsVolumeId: volumeId } = await testUtils.createStandAloneIPAndVolume({
            accessKey, secretKey, region, ethereumAZ
        });

        const cloud = {
            type: types.clouds.aws,
            region,
            instanceType: 't2.micro',
            ethereum: {
                az: ethereumAZ,
                volumeId,
            }
        };

        const result = await c.createConstellation({ cloud, keys });
        expect(result.ok).to.equal(true);
        const { manager: { ip } } = result;

        const pollingResult = await eventuallyReady(ip);
        expect(pollingResult).to.equal(true);

        console.log('stopping here for now...');
        process.exit(0);

        const destroyResult = await c.destroyConstellation({ spinContext: result.spinContext });
        expect(destroyResult.ok).to.equal(true);

        const standAlonePlanOutputAsString = await testUtils.checkPlanForStandAloneIPAndVolume();
        const desiredMessageIndex = standAlonePlanOutputAsString.indexOf('No changes. Infrastructure is up-to-date');
        expect(desiredMessageIndex, 'Expecting to see the IP/EBS are still alive after destroying infra').to.not.equal(-1);

        await testUtils.destroyStandAloneInfra();
    });

    it('should provision a new constellation with a pre-existing Elastic IP and destroy it', async () => {
        // First we will create an Elastic IP outside the scope of createConstellation()
        const { ethereumEbsVolumeId: volumeId, preExistingElasticIp } = await testUtils.createStandAloneIPAndVolume({
            accessKey, secretKey, region, ethereumAZ
        });

        const cloud = {
            type: types.clouds.aws,
            region,
            instanceType: 't2.medium',
            ip: preExistingElasticIp,
            ethereum: {
                az: ethereumAZ,
                volumeId,
            }
        };

        const result = await c.createConstellation({ cloud, keys });
        expect(result.ok).to.equal(true);

        const pollingResult = await eventuallyReady(preExistingElasticIp);
        expect(pollingResult).to.equal(true);

        const destroyResult = await c.destroyConstellation({ spinContext: result.spinContext });
        expect(destroyResult.ok).to.equal(true);

        const standAlonePlanOutputAsString = await testUtils.checkPlanForStandAloneIPAndVolume();
        const desiredMessageIndex = standAlonePlanOutputAsString.indexOf('No changes. Infrastructure is up-to-date');
        expect(desiredMessageIndex, 'Expecting to see the IP/EBS are still alive after destroying infra').to.not.equal(-1);

        await testUtils.destroyStandAloneInfra();
    });
});
