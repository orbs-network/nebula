const { describe, before, after, it } = require('mocha');
const { expect } = require('chai');

const types = require('./../../constants/types');
const { Nebula } = require('./../../lib/services/nebula');

const harness = require('./harness');
const path = require('path');

const nebula = new Nebula();
nebula.setTerraformCachePath(path.join(__dirname, '../../_terraform'));

const region = 'us-east-1';
let preExistingElasticIp;
let nodeName;

// @todo:
//  1) Import edge cases from Boyar E2E
//   Examples:
//   - Disabled VC

describe('nebula core api', () => {
    before(async () => {
        // First we will create an Elastic IP outside the scope of createConstellation()
        console.log('Allocating a public IP from AWS...');
        const result = await harness.aws.getPublicIp(region);
        console.log('Got back:', result);
        expect(result.ok).to.equal(true);
        preExistingElasticIp = result.ip;
        console.log('Global setup completed for nebula core API test!')
    });

    after(async () => {
        const destroyResult = await nebula.destroyConstellation({
            name: nodeName
        });

        expect(destroyResult.error).to.equal(null);
        expect(destroyResult.ok).to.equal(true);

        await harness.aws.destroyPublicIp(region, preExistingElasticIp);
    });

    it('should provision and destroy a constellation', async () => {
        const bucketPrefix = 'boyar-discovery';

        const boyarConfig = require('./../../testnet/boyar');
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
                ethereum: true
            }
        };

        const cloud = {
            type: types.clouds.aws,
            region,
            instanceType: 't2.medium',
            nodeCount: 1,
            bucketPrefix,
            ip: preExistingElasticIp,
        };

        const result = await nebula.createConstellation({
            cloud,
            keys
        });
        expect(result.ok).to.equal(true);
        nodeName = result.name;

        await harness.eventuallyReady({ ip: preExistingElasticIp, boyar: boyarConfig, address });        
    });

});


