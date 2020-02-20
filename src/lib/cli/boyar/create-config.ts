import { readFileSync } from "fs";
import _ from "lodash";
import { resolveHome } from "../methods";

export function getNodes({ configPath }: { configPath: string }) {
  return require(`${configPath}/ips.json`);
}

function readJSON(path: string) {
  return JSON.parse(readFileSync(path).toString());
}

type Chain = { Id: string; DockerConfig: { Tag: string } };
function updateVersionForAllVchains(chains: Chain[], chainVersion: string) {
  _.each(chains, chain => {
    chain.DockerConfig.Tag = chainVersion;
  });
}

function updateVersionPerChain(
  chains: Chain[],
  chainVersion: { [id: string]: string }
) {
  _.each(chains, chain => {
    const proposedVersion = chainVersion[chain.Id];
    if (!_.isEmpty(proposedVersion)) {
      chain.DockerConfig.Tag = proposedVersion;
    }
  });
}

function setBenchmarkConsensusLeaderForAllVchains(chains: any, leader: any) {
  _.each(chains, chain => {
    chain.Config["benchmark-consensus-constant-leader"] = leader;
  });
}

function setNetworkTopology(
  boyarConfig: { network: { address: any; ip: any }[] },
  nodeKeys: any,
  ips: { [x: string]: any }
) {
  boyarConfig.network = _.map(nodeKeys, (keys, region) => {
    return {
      address: keys.address,
      ip: ips[region]
    };
  });
}

export function createBoyarConfig({
  configPath: _configPath,
  chainVersion,
  skipNetworkTopology
}) {
  const configPath = resolveHome(_configPath);

  const nodeKeys = readJSON(`${configPath}/keys.json`);
  const ips = readJSON(`${configPath}/ips.json`);
  const boyarConfig = readJSON(`${configPath}/boyar.json`);

  if (!skipNetworkTopology) {
    setNetworkTopology(boyarConfig, nodeKeys, ips);
  }

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
