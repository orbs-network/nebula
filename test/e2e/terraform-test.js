const { describe, it } = require('mocha');
const chai = require('chai');
const asserttype = require('chai-asserttype');
chai.use(asserttype);

const { expect } = chai;

const path = require('path');
const types = require('./../../constants/types');
const { TerraformService } = require('./../../lib/services/terraform/terraform');
const tf = new TerraformService({});

const tmpPath = path.join(__dirname, '../../_terraform');

describe('terraform service acceptance tests', () => {
    it('should create & destroy AWS infra correctly', async () => {
        const cloud = {
            type: types.clouds.aws,
            region: 'us-east-1',
            instanceType: 't2.micro',
        };

        const keys = {
            aws: {
                accessKey: process.env.AWS_ACCESS_KEY_ID,
                secretKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
            ssh: {
                path: '~/.ssh/id_rsa.pub',
            },
            orbs: {
                publicKey: 'dfc06c5be24a67adee80b35ab4f147bb1a35c55ff85eda69f40ef827bddec173',
                privateKey: '93e919986a22477fda016789cca30cb841a135650938714f85f0000a65076bd4dfc06c5be24a67adee80b35ab4f147bb1a35c55ff85eda69f40ef827bddec173',
            }
        };

        const result = await tf.spinUp({
            cloud,
            keys,
        });

        expect(result.ok).to.equal(true);
        expect(result.outputs).to.be.array();

        const publicIpOutput = result.outputs.find(o => o.key === 'master.ip');
        expect(publicIpOutput).to.be.object();

        expect(publicIpOutput.value) // Expecting a valid IP supplied from Amazon
            .to.match(new RegExp(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/),
                `Expected the AWS supplied public IP to be valid (got: ${publicIpOutput.value})`);

        const spinDownResult = await tf.spinDown({
            spinContext: result.spinContext,
        });

        expect(spinDownResult.ok).to.equal(true);
    });
});
