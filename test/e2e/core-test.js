const { describe, before, after, it } = require('mocha');
const { expect } = require('chai');

const types = require('./../../constants/types');
const { Nebula } = require('./../../lib/services/nebula');
const { Terraform } = require('./../../lib/services/terraform');

const terraformAdapter = new Terraform({});

const harness = require('./harness');
const path = require('path');

const nebula = new Nebula({ terraformAdapter });

const terraformBasepath = path.join(__dirname, '../../_terraform');
nebula.setTerraformCachePath(terraformBasepath);

const ciUniqueIdentifier = ('CI' in process.env) ? `${process.env.CIRCLE_BRANCH.replace(/\//g, '-')}-${process.env.CIRCLE_BUILD_NUM}` : 'first';

const region = 'us-east-1';
let preExistingElasticIp;

// @todo:
//  1) Import edge cases from Boyar E2E
//   Examples:
//   - Disabled VC

const bucketPrefix = 'boyar-discovery';

const boyarConfig = require(path.join(__dirname, '../../testnet/boyar.json'));
const address = 'd27e2e7398e2582f63d0800330010b3e58952ff6';

const keys = {
    aws: {
        profile: 'default',
    },
    ssh: {
        path: '~/.ssh/id_rsa.pub',
        cidr: ['0.0.0.0/0']
    },
    orbs: {
        nodeKeys: {
            address,
            privateKey: "87a210586f57890ae3642c62ceb58f0f0a54e787891054a5a54c80e1da418253",
            leader: "a328846cd5b4979d68a8c58a9bdfeee657b34de7",
        },
        boyarConfig,
        ethereum: false
    }
};

const cloud = {
    type: types.clouds.aws,
    region,
    backend: true,
    name: `my-${ciUniqueIdentifier}-node`,
    instanceType: 't2.medium',
    nodeCount: 1,
    bucketPrefix,
    // ip: preExistingElasticIp,
};

let shouldCleanup = true;

describe('nebula core api', () => {
    before(async () => {
        // First we will create an Elastic IP outside the scope of createConstellation()
        console.log('Allocating a public IP from AWS...');
        preExistingElasticIp = await harness.aws.getPublicIp(region);
        console.log('Address allocated is:', preExistingElasticIp);

        const network = [
            {
                address: "a328846cd5b4979d68a8c58a9bdfeee657b34de7",
                ip: preExistingElasticIp,
            },
            {
                address: "d27e2e7398e2582f63d0800330010b3e58952ff6",
                ip: "3.123.50.149"
            },
            {
                address: "6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9",
                ip: "34.255.219.212"
            }
        ];

        console.log('network topology with our IP is:', network);
        keys.orbs.boyarConfig.network = network;
        console.log('Global setup completed for nebula core API test!');
    });

    after(() => harness.cleanUpTerraformProject({ basePath: terraformBasepath, dirName: cloud.name, shouldCleanup }));
    after(() => harness.cleanUpTerraformProject({ basePath: terraformBasepath, dirName: `${cloud.name}-aside`, shouldCleanup }));
    after(() => harness.aws.destroyPublicIp(region, preExistingElasticIp));

    it('should provision and destroy a constellation', async () => {
        await nebula.createConstellation({
            cloud: Object.assign({}, cloud, {
                ip: preExistingElasticIp,
            }),
            keys
        });

        await harness.eventuallyReady({ ip: preExistingElasticIp, boyar: boyarConfig, address });
        await harness.renameTerraformProjectToAside({ basePath: terraformBasepath, dirName: cloud.name });

        const destroyResult = await nebula.destroyConstellation({
            cloud: Object.assign({}, cloud, {
                ip: preExistingElasticIp,
            }),
            keys
        });

        expect(destroyResult.ok).to.equal(true);
        shouldCleanup = false;
    });

});


