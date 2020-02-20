"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = __importDefault(require("chai"));
const chai_asserttype_1 = __importDefault(require("chai-asserttype"));
chai_1.default.use(chai_asserttype_1.default);
const { expect } = chai_1.default;
const create_config_1 = require("../../lib/cli/boyar/create-config");
mocha_1.describe("boyar config generation", () => {
    mocha_1.it("generates network configuration", () => {
        const config = create_config_1.createBoyarConfig({
            configPath: `${__dirname}/templates`
        });
        expect(config.network).not.to.be.empty;
        expect(config.network).to.be.eql([{
                "address": "6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9",
                "ip": "52.57.222.178"
            },
            {
                "address": "d27e2e7398e2582f63d0800330010b3e58952ff6",
                "ip": "63.35.73.209"
            },
            {
                "address": "a328846cd5b4979d68a8c58a9bdfeee657b34de7",
                "ip": "35.178.161.247"
            }
        ]);
        expect(config.chains[0].Config["benchmark-consensus-constant-leader"]).to.be.eql("6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9");
    });
    mocha_1.it("updates all vchains to the same version", () => {
        const config = create_config_1.createBoyarConfig({
            configPath: `${__dirname}/templates`,
            chainVersion: "some-random-chain-version"
        });
        expect(config.chains[0].DockerConfig.Tag).to.be.eql("some-random-chain-version");
        expect(config.chains[1].DockerConfig.Tag).to.be.eql("some-random-chain-version");
        expect(config.chains[2].DockerConfig.Tag).to.be.eql("some-random-chain-version");
    });
    mocha_1.it("updates vchains one by one", () => {
        const config = create_config_1.createBoyarConfig({
            configPath: `${__dirname}/templates`,
            chainVersion: {
                10000: "diamond dogs",
                20000: "1984",
                30000: "rebel rebel",
            }
        });
        expect(config.chains[0].DockerConfig.Tag).to.be.eql("diamond dogs");
        expect(config.chains[1].DockerConfig.Tag).to.be.eql("1984");
        expect(config.chains[2].DockerConfig.Tag).to.be.eql("rebel rebel");
    });
});
//# sourceMappingURL=boyar-config-tests.js.map