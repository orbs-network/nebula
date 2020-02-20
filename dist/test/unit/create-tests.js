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
const create_1 = require("../../lib/cli/handlers/create");
mocha_1.describe('_create', () => {
    mocha_1.it('generates keys and cloud objects from input', () => {
        const { keys, cloud } = create_1._create({
            "name": "mumbai-node4",
            "awsProfile": "default",
            "sshPublicKey": "~/.ssh/id_rsa.pub",
            "orbsAddress": "54018092153dcdea764f89d33b086c7114e11985",
            "orbsPrivateKey": "1e4c067360dd8b81db5de2609783c505f61f239cd970195d00165dd9e4df774b",
            "publicIp": "52.66.33.249",
            "region": "ap-south-1",
            "nodeSize": "m4.large",
            "nodeCount": 0,
            "configPath": "./templates",
            "chainVersion": "v0.9.3",
            "ethereumChain": "ropsten",
            "ethereumTopologyContractAddress": "0xa8Ef7740D85B1c0c22E39aae896e829Af7c895A5",
            "ethereumEndpoint": "http://eth.orbs.com",
            "incomingSshCidrBlocks": ["0.0.0.0/0"],
            "cachePath": "../terraform",
            // pretend we're in file mode
            "fileMode": true,
            "__fileDirname": __dirname,
        });
        expect(cloud).to.deep.equal({
            "type": "aws",
            "region": "ap-south-1",
            "instanceType": "m4.large",
            "nodeCount": 0,
            "name": "mumbai-node4",
            "ip": "52.66.33.249",
            "bootstrapUrl": undefined,
            "cachePath": process.cwd() + "/test/terraform",
        });
        expect(keys.aws).to.deep.equal({
            "profile": "default"
        });
        expect(keys.ssh).to.deep.equal({
            "path": `${process.env.HOME}/.ssh/id_rsa.pub`,
            "cidr": ["0.0.0.0/0"],
        });
        expect(keys.orbs.nodeKeys).to.deep.equal({
            "address": "54018092153dcdea764f89d33b086c7114e11985",
            "privateKey": "1e4c067360dd8b81db5de2609783c505f61f239cd970195d00165dd9e4df774b"
        });
        expect(keys.orbs.boyarConfig).not.to.be.empty;
        expect(keys.orbs.ethereumEndpoint).to.be.equal("http://eth.orbs.com");
        expect(keys.orbs.ethereumTopologyContractAddress).to.be.equal("0xa8Ef7740D85B1c0c22E39aae896e829Af7c895A5");
    });
});
//# sourceMappingURL=create-tests.js.map