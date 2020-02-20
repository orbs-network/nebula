"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const nock_1 = __importDefault(require("nock"));
const mocha_1 = require("mocha");
const chai_1 = __importDefault(require("chai"));
const chai_asserttype_1 = __importDefault(require("chai-asserttype"));
chai_1.default.use(chai_asserttype_1.default);
const { expect } = chai_1.default;
const metrics_js_1 = require("../../lib/metrics.js");
const HOST = "fake.staging.orbs-test.com";
const HOST_RED = "fake-red.staging.orbs-test.com";
const HOST_GREEN = "fake-green.staging.orbs-test.com";
const PATH = "/vchains/2013";
const ENDPOINT_STAGING = `${HOST}${PATH}`;
const ENDPOINT_STAGING_RED = `${HOST_RED}${PATH}`;
const ENDPOINT_STAGING_GREEN = `${HOST_GREEN}${PATH}`;
function mockMetricsResponse() {
    const response = require(`${__dirname}/metrics.json`);
    nock_1.default.disableNetConnect();
    nock_1.default(`http://${HOST}`)
        .persist()
        .get(`${PATH}/metrics`)
        .reply(200, response);
    nock_1.default(`http://${HOST_RED}`)
        .persist()
        .get(`${PATH}/metrics`)
        .reply(200, response);
    let blockHeight = response["BlockStorage.BlockHeight"].Value;
    nock_1.default(`http://${HOST_GREEN}`)
        .persist()
        .get(`${PATH}/metrics`)
        .reply(200, () => {
        blockHeight += 1;
        const greenResponse = lodash_1.default.cloneDeep(response);
        greenResponse["BlockStorage.BlockHeight"].Value = blockHeight;
        return greenResponse;
    });
}
mocha_1.describe("metrics unit tests", () => {
    mocha_1.before(() => {
        mockMetricsResponse();
    });
    mocha_1.it("should retrive metrics", async () => {
        const blockHeight = await metrics_js_1.getMetrics(ENDPOINT_STAGING);
        expect(blockHeight).not.to.be.empty;
    });
    mocha_1.it("should retrieve block height", async () => {
        const blockHeight = await metrics_js_1.getBlockHeight(ENDPOINT_STAGING);
        expect(blockHeight).be.greaterThan(0);
    });
    mocha_1.it("should retrieve version", async () => {
        const version = await metrics_js_1.getVersion(ENDPOINT_STAGING);
        expect(version).to.include("v0.7.0");
    });
    mocha_1.describe("#waitUntil", () => {
        mocha_1.it("should wait until event occures", async () => {
            let i = 0;
            await metrics_js_1.waitUntil(3, async () => {
                return i += 1;
            }, 2);
            expect(i).to.be.eql(3);
        });
        mocha_1.it("accepts test function", async () => {
            let i = 0;
            await metrics_js_1.waitUntil((value) => {
                return value % 3 == 0;
            }, async () => {
                return i += 1;
            }, 2);
            expect(i).to.be.eql(3);
        });
        mocha_1.it("should return duration of the operation", async () => {
            let i = 0;
            const duration = await metrics_js_1.waitUntil(3, async () => {
                return i += 1;
            }, 2);
            expect(duration).to.be.greaterThan(0);
            expect(duration).to.be.lessThan(8);
        });
        mocha_1.it("should reject if timeout occures", async () => {
            expect(async () => {
                await metrics_js_1.waitUntil(3, async () => {
                    return 0;
                }, 2, 6);
            }).to.throw;
        });
        mocha_1.it("should reject if error occures", async () => {
            expect(async () => {
                await metrics_js_1.waitUntil(3, async () => {
                    throw new Error("NOOOO");
                }, 2, 6);
            }).to.throw;
        });
    });
    mocha_1.describe("#waitUntilSync", () => {
        mocha_1.it("test against staging", async () => {
            await metrics_js_1.waitUntilSync(ENDPOINT_STAGING, 1000);
            expect(await metrics_js_1.getBlockHeight(ENDPOINT_STAGING)).to.be.gte(1000);
        });
    });
    mocha_1.describe("#waitUntilVersion", () => {
        mocha_1.it("test against staging", async () => {
            await metrics_js_1.waitUntilVersion(ENDPOINT_STAGING, "v0.7.0");
            expect(await metrics_js_1.getVersion(ENDPOINT_STAGING)).to.include("v0.7.0");
        });
    });
    mocha_1.describe("#waitUntilCommit", () => {
        mocha_1.it("test against staging", async () => {
            await metrics_js_1.waitUntilCommit(ENDPOINT_STAGING, "83a149e4");
            console.log(await metrics_js_1.getCommit(ENDPOINT_STAGING));
            expect(await metrics_js_1.getCommit(ENDPOINT_STAGING)).to.include("83a149e4");
        });
    });
    mocha_1.describe("#getStatus", () => {
        mocha_1.it("returns status object for endpoints", async () => {
            const status = await metrics_js_1.getStatus({
                "first-node": ENDPOINT_STAGING
            }, 10, 100);
            expect(status).to.be.eql({
                "first-node": {
                    "blockHeight": 1079369,
                    "status": "red",
                    "version": "v0.7.0",
                    "commit": "83a149e41764d820ddd36091c74563ee2ab176b6",
                    "ethereum": {
                        "lastBlock": 0,
                        "syncStatus": "",
                        "txReceiptsStatus": ""
                    }
                }
            });
        });
        mocha_1.it("marks endpoints as green/red", async () => {
            const status = await metrics_js_1.getStatus({
                "green-node": ENDPOINT_STAGING_GREEN,
                "red-node": ENDPOINT_STAGING_RED
            }, 10, 100);
            expect(status["green-node"].blockHeight).to.be.gt(1079369);
            expect(status["green-node"].status).to.be.eql("green");
            expect(status["red-node"].blockHeight).to.be.eql(1079369);
            expect(status["red-node"].status).to.be.eql("red");
        });
    });
});
//# sourceMappingURL=metrics-tests.js.map