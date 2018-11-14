const { describe, it } = require('mocha');
const { expect } = require('chai');

const types = require('./../../constants/types');
const { TerraformService } = require('./../../lib/services/terraform/terraform');
const tf = new TerraformService({});

describe('terraform service acceptance tests', () => {
    it('should create AWS infra correctly', async () => {
        const cloud = {
            type: types.clouds.aws,
            region: 'us-east-1',
            instanceType: 't2.micro',
        };

        const keys = {
            aws: {
                accessKey: 'test-access-key',
                secretKey: 'test-secret-key',
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
        expect('publicDns' in result).to.equal(true);
        expect(result.publicDns).to.equal('some-aws-dns-resolvable.com');
    });
});