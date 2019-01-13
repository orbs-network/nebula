const { describe, it } = require('mocha');
const chai = require('chai');
const asserttype = require('chai-asserttype');
chai.use(asserttype);

const { expect } = chai;

const { TerraformService } = require('./../../lib/services/terraform/terraform');
const tf = new TerraformService({});

describe('terraform service unit tests', () => {
    it('should parse terraform outputs correctly', () => {
        const cleanOutputs = [
            {
                key: 'manager.public_ip',
                value: '1.2.4.5',
            },
            {
                key: 'manager.public_dns',
                value: 'ec2-1-2-4-5.somezone.amazon.com',
            }
        ];

        const dataAsString = cleanOutputs
            .map(({ key, value }) => `\u001b[0m${key}\u001b[0m = \u001b[0m${value}\u001b[0m`)
            .join('\n');

        const result = tf.parseOutputs(dataAsString);
        expect(result).to.be.array();
        expect(result.length).to.equal(2);
        expect(result).to.deep.equal(cleanOutputs);
    });

    it('should return an empty [] when there are no outputs in the string', () => {
        const result = tf.parseOutputs('fadssaf\n');
        expect(result).to.be.array();
        expect(result.length).to.equal(0);
    });
});