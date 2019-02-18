const _ = require("lodash");
const nock = require("nock");
const {
    describe,
    it
} = require("mocha");
const chai = require("chai");
const asserttype = require("chai-asserttype");
chai.use(asserttype);

const {
    expect
} = chai;

const {
    getMetrics,
    getBlockHeight,
    getVersion,
    getCommit,
    waitUntil,
    waitUntilSync,
    waitUntilVersion,
    waitUntilCommit,
    getStatus
} = require("./../../lib/metrics.js");

const HOST = "fake.staging.orbs-test.com";
const HOST_RED = "fake-red.staging.orbs-test.com";
const HOST_GREEN = "fake-green.staging.orbs-test.com";

const PATH = "/vchains/2013";
const ENDPOINT_STAGING = `${HOST}${PATH}`;
const ENDPOINT_STAGING_RED = `${HOST_RED}${PATH}`;
const ENDPOINT_STAGING_GREEN = `${HOST_GREEN}${PATH}`;

function mockMetricsResponse() {
    const response = require(`${__dirname}/metrics.json`);

    nock.disableNetConnect();

    nock(`http://${HOST}`)
    .persist()
    .get(`${PATH}/metrics`)
    .reply(200, response);

    nock(`http://${HOST_RED}`)
    .persist()
    .get(`${PATH}/metrics`)
    .reply(200, response);

    let blockHeight = response["BlockStorage.BlockHeight"].Value;

    nock(`http://${HOST_GREEN}`)
    .persist()
    .get(`${PATH}/metrics`)
    .reply(200, () => {
        blockHeight += 1;
        const greenResponse = _.cloneDeep(response);
        greenResponse["BlockStorage.BlockHeight"].Value = blockHeight;
        return greenResponse;
    });
}

describe("metrics unit tests", () => {
    before(() => {
        mockMetricsResponse()
    });

    it("should retrive metrics", async () => {
        const blockHeight = await getMetrics(ENDPOINT_STAGING);
        expect(blockHeight).not.to.be.empty;
    });

    it("should retrieve block height", async () => {
        const blockHeight = await getBlockHeight(ENDPOINT_STAGING);
        expect(blockHeight).be.greaterThan(0);
    });

    it("should retrieve version", async () => {
        const version = await getVersion(ENDPOINT_STAGING);
        expect(version).to.include("v0.7.0")
    })

    describe("#waitUntil", () => {
        it("should wait until event occures", async () => {
            let i = 0;

            await waitUntil(3, async () => {
                return i += 1;
            }, 2);

            expect(i).to.be.eql(3);
        });

        it("accepts test function", async () => {
            let i = 0;

            await waitUntil((value) => {
                return value % 3 == 0;
            }, async () => {
                return i += 1;
            }, 2);

            expect(i).to.be.eql(3);
        });

        it("should return duration of the operation", async () => {
            let i = 0;

            const duration = await waitUntil(3, async () => {
                return i += 1;
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
            expect(await getBlockHeight(ENDPOINT_STAGING)).to.be.gte(1000);
        });
    });

    describe("#waitUntilVersion", () => {
        it("test against staging", async () => {
            await waitUntilVersion(ENDPOINT_STAGING, "v0.7.0");
            expect(await getVersion(ENDPOINT_STAGING)).to.include("v0.7.0");
        });
    });

    describe("#waitUntilCommit", () => {
        it("test against staging", async () => {
            await waitUntilCommit(ENDPOINT_STAGING, "83a149e4");

            console.log(await getCommit(ENDPOINT_STAGING));
            expect(await getCommit(ENDPOINT_STAGING)).to.include("83a149e4");
        });
    });


    describe("#getStatus", () => {
        it("returns status object for endpoints", async () => {
            const status = await getStatus({
                "first-node": ENDPOINT_STAGING
            });

            expect(status).to.be.eql({
                "first-node": {
                    "blockHeight": 1079369,
                    "status": "red",
                    "version": "v0.7.0",
                    "commit": "83a149e41764d820ddd36091c74563ee2ab176b6"
                }
            });
        });

        it("marks endpoints as green/red", async () => {
            const status = await getStatus({
                "green-node": ENDPOINT_STAGING_GREEN,
                "red-node": ENDPOINT_STAGING_RED
            });

            expect(status["green-node"].blockHeight).to.be.gt(1079369);
            expect(status["green-node"].status).to.be.eql("green");

            expect(status["red-node"].blockHeight).to.be.eql(1079369);
            expect(status["red-node"].status).to.be.eql("red");
        });
    })
});
