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

describe.only('nebula core api', () => {
    before(async () => {
        // First we will create an Elastic IP outside the scope of createConstellation()
        console.log('Allocating a public IP from AWS...');
        const result = await harness.aws.getPublicIp(region);
        console.log('Got back:', result);
        expect(result.ok).to.equal(true);
        preExistingElasticIp = result.ip;
        console.log('Global setup completed for nebula core API test!');
    });

    after(async () => {
        if (!nodeName) {
            const destroyResult = await nebula.destroyConstellation({
                name: nodeName
            });

            expect(destroyResult.error).to.equal(null);
            expect(destroyResult.ok).to.equal(true);
        }
    });

    after(() => harness.aws.destroyPublicIp(region, preExistingElasticIp));

    function mockTopologyContract() {
        let topology = {};
        return {
            ip2hex(ip) {
                return (ip.split('.').reduce(function (ipInt, octet) { return (ipInt << 8) + parseInt(octet, 10) }, 0) >>> 0).toString(16);
            },
            setTopology(t) {
                topology = {
                    nodeAddresses: t.map(n => `0x${n.address}`),
                    ipAddresses: t.map(n => `0x${this.ip2hex(n.ip)}`),
                };
            },
            getNetworkTopology() {
                return {
                    call: async () => {
                        return topology;
                    }
                };
            }
        }
    }

    it('should provision and destroy a constellation', async () => {
        const bucketPrefix = 'boyar-discovery';
        const mockTopology = mockTopologyContract();

        const topology = [
            {
                address: '0c4e040fb7991f6aeb96e25708bf5a366d66c925',
                ip: '3.134.6.50',
            },
            {
                address: '7a11b8f6e739ca74d7c4fe3b8a2a8d213d83e768',
                ip: '3.210.140.137',
            }
        ];

        // {
        //     nodeAddresses: [
        //         `0x${address}`,
        //         '0x0c4e040fb7991f6aeb96e25708bf5a366d66c925',
        //         '0x7a11b8f6e739ca74d7c4fe3b8a2a8d213d83e768',
        //     ],
        //     ipAddresses: [
        //         '0x7f000001', '0x03860632', '0x03d28c89',
        //     ]
        // }

        mockTopology.setTopology(topology);

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
            topologyProvider: mockTopology,
            chains: boyarConfig.chains,
            cloud,
            keys
        });

        expect(result.ok).to.equal(true);
        nodeName = result.name;

        await harness.eventuallyReady({ ip: preExistingElasticIp, boyar: boyarConfig, address, topology });
    });

});


