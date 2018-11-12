const { describe, it } = require('mocha');
const { expect } = require('chai');

const { CoreService } = require('./../../lib/services/core/core');

const c = new CoreService({});

describe('Nebula core', () => {
    it('should provision a new constellation', async () => {
        const result = await c.createConstelltation({});
        expect(result.ok).to.equal(true);
    });
});