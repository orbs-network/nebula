const _ = require('lodash');

function readJSON(path) {
    return JSON.parse(readFileSync(path).toString());
}

function updateVersionForAllVchains(chains, chainVersion) {
    _.each(chains, (chain) => {
        chain.DockerConfig.Tag = chainVersion;
    });
}

function updateVersionPerChain(chains, chainVersion) {
    _.each(chains, (chain) => {
        const proposedVersion = chainVersion[chain.Id];
        if (!_.isEmpty(proposedVersion)) {
            chain.DockerConfig.Tag = proposedVersion;
        }
    });
}

function setBenchmarkConsensusLeaderForAllVchains(chains, leader) {
    _.each(chains, (chain) => {
        chain.Config["benchmark-consensus-constant-leader"] = leader;
    });
}

function setNetworkTopology(boyarConfig, nodeKeys, ips) {
    boyarConfig.network = _.map(nodeKeys, (keys, region) => {
        return {
            "address": keys.address,
            "ip": ips[region],
        };
    });
}

function createBoyarConfig({ configPath: _configPath, chainVersion }) {
    const configPath = resolveHome(_configPath);

    const nodeKeys = readJSON(`${configPath}/keys.json`);
    const ips = readJSON(`${configPath}/ips.json`);
    const boyarConfig = readJSON(`${configPath}/boyar.json`);

    setNetworkTopology(boyarConfig, nodeKeys, ips);

    const benchmarkLeader = nodeKeys[_.keys(nodeKeys)[0]].address;
    setBenchmarkConsensusLeaderForAllVchains(boyarConfig.chains, benchmarkLeader);

    if (!_.isEmpty(chainVersion)) {
        if (_.isString(chainVersion)) {
            updateVersionForAllVchains(boyarConfig.chains, chainVersion);
        } else if (_.isObject(chainVersion)) {
            updateVersionPerChain(boyarConfig.chains, chainVersion);
        }
    }

    return boyarConfig;
}

module.exports = {
    createBoyarConfig,
};