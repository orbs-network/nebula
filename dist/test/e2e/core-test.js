"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const types_1 = __importDefault(require("../../constants/types"));
const nebula_1 = require("../../lib/services/nebula");
const harness_1 = __importDefault(require("./harness"));
const path_1 = __importDefault(require("path"));
const nebula = new nebula_1.Nebula();
nebula.setTerraformCachePath(path_1.default.join(__dirname, '../../_terraform'));
const region = 'us-east-1';
let preExistingElasticIp;
let nodeName;
// @todo:
//  1) Import edge cases from Boyar E2E
//   Examples:
//   - Disabled VC
mocha_1.describe('nebula core api', () => {
    mocha_1.before(async () => {
        // First we will create an Elastic IP outside the scope of createConstellation()
        console.log('Allocating a public IP from AWS...');
        const result = await harness_1.default.aws.getPublicIp(region);
        console.log('Got back:', result);
        chai_1.expect(result.ok).to.equal(true);
        preExistingElasticIp = result.ip;
        console.log('Global setup completed for nebula core API test!');
    });
    mocha_1.after(async () => {
        const destroyResult = await nebula.destroyConstellation({
            name: nodeName
        });
        chai_1.expect(destroyResult.error).to.equal(null);
        chai_1.expect(destroyResult.ok).to.equal(true);
        await harness_1.default.aws.destroyPublicIp(region, preExistingElasticIp);
    });
    mocha_1.it('should provision and destroy a constellation', async () => {
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
            type: types_1.default.clouds.aws,
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
        chai_1.expect(result.ok).to.equal(true);
        nodeName = result.name;
        await harness_1.default.eventuallyReady({ ip: preExistingElasticIp, boyar: boyarConfig, address });
    });
});
//# sourceMappingURL=core-test.js.map