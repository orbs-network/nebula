const types = require('./constants/types');
const { CoreService } = require('./lib/services/core/core');
const readDir = require('fs').readdirSync;
const readFileSync = require('fs').readFileSync;
const request = require("request-promise");
const _ = require('lodash');

// (async () => {
//     const c = new CoreService({});

//     await Promise.all(readDir("./_terraform").map(async (f) => {
//         return c.destroyConstellation({
//             spinContext: f
//         })
//     }));
    
//     const result = await c.createConstellation({ cloud, keys });

//     console.log({
//         spinContext: result.spinContext,
//     });
// })();

async function getBlockHeight(endpoint) {
    try {
        const body = await request(`http://${endpoint}/metrics`);
        return JSON.parse(body)["BlockStorage.BlockHeight"].Value;    
    } catch (e) {
        console.log(e)
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
  
          if (newBlockHeight >= targetBlockHeight) {
              clearInterval(interval);
              const diff = (Date.now() - start) / 1000;
              resolve(`Sync finished successfully in ${diff}s`);
          }
        } catch (e) {
          console.log(`Error: ${e}`);
        }
      }, 5000);
    });
  }

(async () => {
    const regions = ["eu-central-1"];

    const nodeKeys = JSON.parse(readFileSync(`${__dirname}/testnet/keys.json`).toString());
    const ips = JSON.parse(readFileSync(`${__dirname}/testnet/ips.json`).toString());

    const c = new CoreService({});

    for (const region of regions) {
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
        };        

        const keys = {
            aws: {
                accessKey: process.env.AWS_ACCESS_KEY_ID,
                secretKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
            ssh: {
                path: '~/.ssh/id_rsa.pub',
            },
            orbs: { publicKey, privateKey, leader }
        };

        const endpoint = `${region}.global.nodes.staging.orbs-test.com/vchains/42`
        const blockHeight = await getBlockHeight(endpoint);

        await Promise.all(readDir("./_terraform").map(async (f) => {
            return c.destroyConstellation({
                spinContext: f
            })
        }));    

        const result = await c.createConstellation({ cloud, keys });

        if (shouldSync || true) {
            await waitUntilSync(endpoint, blockHeight)
        }

        console.log({
            spinContext: result.spinContext,
        });
    }
})();
