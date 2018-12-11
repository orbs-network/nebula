const types = require('./constants/types');
const { CoreService } = require('./lib/services/core/core');
const readDir = require('fs').readdirSync;
const readFileSync = require('fs').readFileSync;
const existsSync = require('fs').existsSync;
const removeSync = require('fs-extra').removeSync;
const request = require("request-promise");
const _ = require('lodash');

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

(async () => {
    const regions = (process.env.REGIONS || "").split(",");
    if (regions.length == 0) {
        console.log("Specify a region or list or regions with REGIONS env variable");
        process.exit(0);
    }

    const nodeKeys = JSON.parse(readFileSync(`${__dirname}/testnet/keys.json`).toString());
    const ips = JSON.parse(readFileSync(`${__dirname}/testnet/ips.json`).toString());
    const boyarConfig = JSON.parse(readFileSync(`${__dirname}/testnet/boyar.json`).toString());

    boyarConfig.network = _.map(nodeKeys, (keys, region) => {
        return {
            "Key": keys[0],
            "IP": ips[region],
        };
    });

    const c = new CoreService({});

    for (const region of regions) {
        console.log(`Deploying to ${region}`);

        const publicKey = nodeKeys[region][0];
        const privateKey = nodeKeys[region][1];
        const peerKeys = _.map(nodeKeys, (v, k) => v[0]);
        const leader = peerKeys[0];
        const shouldSync = leader == publicKey;
        const ip = ips[region];

        const cloud = {
            type: types.clouds.aws,
            region: region,
            instanceType: 't3.medium',
            ip: ip,
            spinContext: region
        };        

        const keys = {
            aws: {
                accessKey: process.env.AWS_ACCESS_KEY_ID,
                secretKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
            ssh: {
                path: '~/.ssh/id_rsa.pub',
            },
            orbs: {
                nodeKeys: { publicKey, privateKey, leader },
                boyarConfig,
            }
        };

        const endpoint = `${region}.global.nodes.staging.orbs-test.com/vchains/42`
        const blockHeight = await getBlockHeight(endpoint);
        console.log(`Current block height: ${blockHeight}`);

        const outputDir = `${__dirname}/_terraform/${region}`;
        if (existsSync(outputDir)) {
            await c.destroyConstellation({
                spinContext: region,
            })

            removeSync(outputDir);
        }

        const result = await c.createConstellation({ cloud, keys });

        if (shouldSync) {
            await waitUntilSync(endpoint, blockHeight)
        }

        console.log({
            spinContext: result.spinContext,
        });
    }
})();
