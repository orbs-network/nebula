const { describe, it } = require('mocha');
const { expect } = require('chai');
const fetch = require('node-fetch');
const { trim } = require('lodash');

const types = require('./../../constants/types');
const { CoreService } = require('./../../lib/services/core/core');

const c = new CoreService({});

describe('Nebula core', () => {
    it('should provision a new constellation and destroy it', async () => {
        const cloud = {
            type: types.clouds.aws,
            region: 'us-east-1',
            instanceType: 't2.micro',
        };

        const keys = {
            aws: {
                accessKey: process.env.AWS_ACCESS_KEY,
                secretKey: process.env.AWS_SECRET_KEY,
            },
            ssh: {
                path: '~/.ssh/id_rsa.pub',
            },
            orbs: {
                publicKey: 'dfc06c5be24a67adee80b35ab4f147bb1a35c55ff85eda69f40ef827bddec173',
                privateKey: '93e919986a22477fda016789cca30cb841a135650938714f85f0000a65076bd4dfc06c5be24a67adee80b35ab4f147bb1a35c55ff85eda69f40ef827bddec173',
            }
        };

        const result = await c.createConstellation({ cloud, keys });
        expect(result.ok).to.equal(true);

        let poll = true;
        let pollCount = 0;

        do {
            console.log(`polling the cluster deployed service... [${pollCount}]`);
            const pollResult = await fetch(`http://${result.master.dns}:8080`)
                .catch(err => err);

            const pollResultAsText = (pollResult.ok) ?
                trim(await pollResult.text()) : '';

            console.log('polling result: ', pollResultAsText);
            if (pollResultAsText === 'Hello, Cruel World!') {
                poll = false;
            } else {
                pollCount++;
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }
        } while (poll && pollCount < 60);

        expect(pollCount).to.be.lessThan(60);
        expect(poll).to.equal(false);

        const destroyResult = await c.destroyConstellation({ spinContext: result.spinContext });
        expect(destroyResult.ok).to.equal(true);
    });
});