const { describe, it } = require("mocha");
const chai = require("chai");
const asserttype = require("chai-asserttype");
chai.use(asserttype);

const { expect } = chai;

const { getMetrics, getBlockHeight, waitUntil, waitUntilSync } = require("./../../lib/metrics.js");

const ENDPOINT_STAGING = "us-east-1.global.nodes.staging.orbs-test.com/vchains/2013";

describe.only("metrics unit tests", () => {
    it("should retrive metrics", async () => {
        const blockHeight = await getMetrics(ENDPOINT_STAGING);
        expect(blockHeight).not.to.be.empty;
    });

    it("should retrive block height", async () => {
        const blockHeight = await getBlockHeight(ENDPOINT_STAGING);
        expect(blockHeight).be.greaterThan(0);
    });
    
    describe("#waitUntil", () => {
        it("should wait until event occures", async () => {
            let i = 0;
            
            await waitUntil(3, async () => {
                return i+=1;
            }, 2);

            expect(i).to.be.eql(3);
        });

        it("should return duration of the operation", async () => {
            let i = 0;
            
            const duration = await waitUntil(3, async () => {
                return i+=1;
            }, 2);

            expect(duration).to.be.greaterThan(0);
            expect(duration).to.be.lessThan(8);
        });


        it("should reject if timeout occures", async () => {
            expect(async () => {
                await waitUntil(3, async () => {
                    return 0;
                }, 2, 6);
            }).to.throw;
        });

        it("should reject if error occures", async () => {
            expect(async () => {
                await waitUntil(3, async () => {
                    throw new Error("NOOOO");
                }, 2, 6);
            }).to.throw;
        });
    });

    describe("#waitUntilSync", () => {
        it("test against staging", async () => {
            await waitUntilSync(ENDPOINT_STAGING, 1000);

            console.log(await getBlockHeight(ENDPOINT_STAGING));
            expect(await getBlockHeight(ENDPOINT_STAGING)).to.be.gte(1000);
        });
    });
});
