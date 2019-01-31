const types = require('./constants/types');
const { CoreService } = require('./lib/services/core/core');
const { TerraformService } = require('./lib/services/terraform/terraform');
const terraformProdAdapter = require('./lib/adapters/terraform/adapter');
const { coreAdapter } = require('./lib/adapters/core/adapter');
const writeFile = require('fs').writeFileSync;
const readFileSync = require('fs').readFileSync;
const existsSync = require('fs').existsSync;
const removeSync = require('fs-extra').removeSync;
const request = require("request-promise");
const _ = require('lodash');
const nconf = require('nconf');
const shell = require('shelljs');
const Promise = require('bluebird');

async function getBlockHeight(endpoint) {
    try {
        const body = await request(`http://${endpoint}/metrics`, {
            timeout: 2000,
        });
        return JSON.parse(body)["BlockStorage.BlockHeight"].Value;    
    } catch (e) {
        console.log(`Error: ${e.message}`);
        return 0;
    }
}

async function waitUntilSync(endpoint, targetBlockHeight) {
    return new Promise((resolve, reject) => {
      const start = new Date().getTime();
  
      const interval = setInterval(async () => {
        // Reject after 15 minutes
        if ((new Date().getTime() - start) / 1000 > 60 * 15) {
          resolve("Sync timed out");
        }
  
        try {
          const newBlockHeight = await getBlockHeight(endpoint);
          console.log(`Waiting for the node ${endpoint} to sync...`);
          console.log(`Synced ${newBlockHeight}/${targetBlockHeight}`);
  
          if (newBlockHeight >= targetBlockHeight) {
              clearInterval(interval);
              const diff = (Date.now() - start) / 1000;
              console.log(`Sync finished successfully in ${diff}s`);
              resolve();
          }
        } catch (e) {
          console.log(`Error: ${e}`);
        }
      }, 5000);
    });
}

function getConfig() {
    const argsConfig = {
        parseValues: true
      };

    return nconf.env(argsConfig).argv(argsConfig);
}

function parseCLIOptions() {
    const config = getConfig();

    const removeNode = config.get("remove-node");
    const createNode = config.get("create-node");
    const updateVchains = config.get("update-vchains");
    const chainVersion = config.get("chain-version");
    const reset = config.get("reset");
    const sshPublicKey = config.get("ssh-public-key") || '~/.ssh/id_rsa.pub';
    const awsProfile = config.get("aws-profile") || "default";
    const ethereumEnabled = config.get("ethereum-enabled");

    const regions = config.get("regions").split(",");

    const pathToConfig = config.get("config") || `${__dirname}/testnet`;
    const pathToCache = config.get("cache") || `${__dirname}/_terraform`;

    const contextPrefix = config.get("context-prefix");

    return {
        removeNode,
        createNode,
        updateVchains,
        chainVersion,
        reset,
        sshPublicKey,
        awsProfile,
        ethereumEnabled,
        regions,
        pathToConfig,
        pathToCache,
        contextPrefix
    }
}

async function deploy(options) {
    const {
        removeNode,
        createNode,
        updateVchains,
        chainVersion,
        reset,
        sshPublicKey,
        awsProfile,
        ethereumEnabled,
        regions,
        pathToConfig,
        pathToCache,
        contextPrefix
    } = options;

    if (regions.length == 0) {
        console.log("Specify a region or list or regions with REGIONS env variable");
        process.exit(0);
    }

    const nodeKeys = JSON.parse(readFileSync(`${pathToConfig}/keys.json`).toString());
    const ips = JSON.parse(readFileSync(`${pathToConfig}/ips.json`).toString());
    const boyarConfig = JSON.parse(readFileSync(`${pathToConfig}/boyar.json`).toString());
    const cloudConfig = JSON.parse(readFileSync(`${pathToConfig}/cloud.json`).toString());

    boyarConfig.network = _.map(nodeKeys, (keys, region) => {
        return {
            "address": keys.address,
            "ip": ips[region],
        };
    });

    if (!_.isEmpty(chainVersion)) {
        _.each(boyarConfig.chains, (chain) => {
            chain.DockerConfig.Tag = chainVersion
        });

        console.log(JSON.stringify(boyarConfig, 2, 2));
    }

    let returnValue = 0;

    for (const region of regions) {
        console.log(`Deploying to ${region}`);

        const address = nodeKeys[region].address;
        const privateKey = nodeKeys[region].privateKey;
        const nodeAddresses = _.map(nodeKeys, 'address');
        const leader = nodeAddresses[0];
        const shouldSync = reset ? false : leader == address;

        const ip = ips[region];

        const spinContext = contextPrefix ? `${contextPrefix}-${region}` : region;

        const cloud = _.merge(cloudConfig, {
            type: types.clouds.aws,
            region: region,
            instanceType: 't2.medium',
            ip: ip,
            spinContext: spinContext
        });

        const keys = {
            aws: {
                profile: awsProfile,
            },
            ssh: {
                path: sshPublicKey,
            },
            orbs: {
                nodeKeys: { address, privateKey, leader },
                boyarConfig,
                ethereum: ethereumEnabled,
            }
        };

        const vchains = _.map(boyarConfig.chains, "Id");
        const endpoints = _.map(vchains, (vchain) => `${ip}/vchains/${vchain}`);

        const blockHeights = await Promise.map(endpoints, getBlockHeight);

        for (let i in vchains) {
            console.log(`Current block height for vchain ${vchains[i]}: ${blockHeights[i]}`);
        }

        const c = new CoreService(new TerraformService(terraformProdAdapter, pathToCache), coreAdapter);

        if (removeNode) {
            const outputDir = `${pathToCache}/${spinContext}`;
            if (existsSync(outputDir)) {
                await c.destroyConstellation({
                    spinContext
                });

                removeSync(outputDir);
            }
        }

        if (createNode) {
            const result = await c.createConstellation({ cloud, keys });
            console.log({
                spinContext: result.spinContext,
            });
        }

        if (updateVchains) {
            const tmpPath = `/tmp/${region}.boyar.json`;
            writeFile(tmpPath, JSON.stringify(boyarConfig));

            const profile = _.isEmpty(awsProfile) ? "" : `--profile ${awsProfile}`
            const command = `aws s3 cp --acl public-read ${tmpPath} ${profile} s3://${cloud.bucketPrefix}-${region}/boyar/config.json`;
            console.log(command);

            shell.exec(command);
        }

        if (shouldSync) {
            if (updateVchains) {
                // wait for a minute until boyar config is updated and we start getting accurate information about metrics
                console.log(`Waiting for boyar config to be refreshed by the constellation...`)
                await Promise.delay(60000);
            }

            await Promise.map(endpoints, (endpoint, idx) => {
                return waitUntilSync(endpoint, blockHeights[idx]);
            });
        }
    }

    return returnValue;
}

if (!module.parent) {
    (async () => {
        try {
            const returnValue = await deploy(parseCLIOptions());
            process.exit(returnValue);
        } catch (e) {
            console.log(e);
            process.exit(1);
        }
    })();
} else {
    module.exports = {
        deploy,
        getBlockHeight,
        waitUntilSync,
        getConfig
    };
}
