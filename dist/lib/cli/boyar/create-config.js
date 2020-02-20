"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const lodash_1 = __importDefault(require("lodash"));
const methods_1 = require("../methods");
function getNodes({ configPath }) {
    return require(`${configPath}/ips.json`);
}
function readJSON(path) {
    return JSON.parse(fs_1.readFileSync(path).toString());
}
function updateVersionForAllVchains(chains, chainVersion) {
    lodash_1.default.each(chains, (chain) => {
        chain.DockerConfig.Tag = chainVersion;
    });
}
function updateVersionPerChain(chains, chainVersion) {
    lodash_1.default.each(chains, (chain) => {
        const proposedVersion = chainVersion[chain.Id];
        if (!lodash_1.default.isEmpty(proposedVersion)) {
            chain.DockerConfig.Tag = proposedVersion;
        }
    });
}
function setBenchmarkConsensusLeaderForAllVchains(chains, leader) {
    lodash_1.default.each(chains, (chain) => {
        chain.Config["benchmark-consensus-constant-leader"] = leader;
    });
}
function setNetworkTopology(boyarConfig, nodeKeys, ips) {
    boyarConfig.network = lodash_1.default.map(nodeKeys, (keys, region) => {
        return {
            "address": keys.address,
            "ip": ips[region],
        };
    });
}
function createBoyarConfig({ configPath: _configPath, chainVersion, skipNetworkTopology }) {
    const configPath = methods_1.resolveHome(_configPath);
    const nodeKeys = readJSON(`${configPath}/keys.json`);
    const ips = readJSON(`${configPath}/ips.json`);
    const boyarConfig = readJSON(`${configPath}/boyar.json`);
    if (!skipNetworkTopology) {
        setNetworkTopology(boyarConfig, nodeKeys, ips);
    }
    const benchmarkLeader = nodeKeys[lodash_1.default.keys(nodeKeys)[0]].address;
    setBenchmarkConsensusLeaderForAllVchains(boyarConfig.chains, benchmarkLeader);
    if (!lodash_1.default.isEmpty(chainVersion)) {
        if (lodash_1.default.isString(chainVersion)) {
            updateVersionForAllVchains(boyarConfig.chains, chainVersion);
        }
        else if (lodash_1.default.isObject(chainVersion)) {
            updateVersionPerChain(boyarConfig.chains, chainVersion);
        }
    }
    return boyarConfig;
}
exports.default = {
    createBoyarConfig,
    getNodes,
};
//# sourceMappingURL=create-config.js.map