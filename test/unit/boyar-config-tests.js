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
    createBoyarConfig
} = require("../../lib/cli/cli");

describe("boyar config generation", () => {
    it("generates network configuration", () => {
        const config = createBoyarConfig({
            configPath: `${__dirname}/../e2e/private-network/templates`
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
                "ip": "52.56.242.67"
            }
        ]);

        expect(config.chains[0].Config["benchmark-consensus-constant-leader"]).to.be.eql("6e2cb55e4cbe97bf5b1e731d51cc2c285d83cbf9");
    });

    it("updates all vchains to the same version", () => {
        const config = createBoyarConfig({
            configPath: `${__dirname}/../e2e/private-network/templates`,
            chainVersion: "some-random-chain-version"
        });

        expect(config.chains[0].DockerConfig.Tag).to.be.eql("some-random-chain-version");
        expect(config.chains[1].DockerConfig.Tag).to.be.eql("some-random-chain-version");
        expect(config.chains[2].DockerConfig.Tag).to.be.eql("some-random-chain-version");
    });

    it("updates vchains one by one", () => {
        const config = createBoyarConfig({
            configPath: `${__dirname}/../e2e/private-network/templates`,
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
