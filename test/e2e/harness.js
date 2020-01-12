const _ = require('lodash');
const { trim } = _;
const { exec: _exec } = require('child-process-promise');
const path = require('path');
const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);

const AWS = require('aws-sdk');
const uuid = require('uuid');

const fixtures = require('./fixtures/nodes.json');
const boyar = require('./fixtures/boyar.json');

async function exec(cmd, opts) {
    console.log('[exec-call] $ ', cmd, opts);
    let result;

    try {
        // Contain fails within exec
        result = await _exec(cmd, opts);
    } catch (err) {
        result = {
            stderr: err,
            stdout: '',
            childProcess: {
                exitCode: 9,
            },
        };
    }

    console.log('exit code: ', result.childProcess.exitCode);
    console.log('stdout: ', result.stdout);
    console.log('stderr: ', result.stderr);

    result.exitCode = result.childProcess.exitCode;

    return result;
}

function circleCiBuildNumber() {
    return process.env.CIRCLE_BUILD_NUM || uuid().split('-')[1];
}

function generateIpsConfig(nodes) {
    return _.reduce(nodes, (result, node) => {
        return _.merge(result, {
            [node.name]: node.publicIp
        });
    }, {});
}

function generateKeysConfig(nodes) {
    return _.reduce(nodes, (result, node) => {
        return _.merge(result, {
            [node.name]: {
                address: node.orbsAddress,
            }
        });
    }, {});
}

module.exports = {
    exec,
    fixtures,
    writeNodesJSONsToDisc(jsons) {
        return Promise.all(jsons.map((json, index) => {
            const targetPath = path.join(__dirname, 'private-network/nodes', `node${index + 1}.json`);
            return writeFile(targetPath, JSON.stringify(json, 2, 2));
        }));
    },
    deleteNodesJSONsFromDisk(jsons) {
        return Promise.all(jsons.map((_, index) => unlink(path.join(__dirname, 'private-network/nodes', `node${index + 1}.json`))));
    },
    getElasticIPsInRegions(regions) {
        return Promise.all(regions.map(async (region) => ({region, ip: await this.aws.getPublicIp(region)})));
    },
    writeBoyarConfig() {
        const targetPath = path.join(__dirname, 'private-network/templates/boyar.json');
        return fs.writeFileSync(targetPath, JSON.stringify(boyar, 2, 2));
    },
    writeConfigurationFiles(nodes) {
        this.writeBoyarConfig();

        const basePath = path.join(__dirname, 'private-network/templates');
        const ipsTargetPath = path.join(basePath, 'ips.json');
        const keysTargetPath = path.join(basePath, 'keys.json');

        fs.writeFileSync(ipsTargetPath, JSON.stringify(generateIpsConfig(nodes), 2, 2));
        fs.writeFileSync(keysTargetPath, JSON.stringify(generateKeysConfig(nodes), 2, 2));
    },
    aws: {
        async getPublicIp(region) {
            const ec2 = new AWS.EC2({
                region
            });

            const response = await ec2.allocateAddress({
                Domain: 'vpc'
            }).promise();

            return response.PublicIp;
        },
        async destroyPublicIp(region, ip) {
            console.log(`Attempting to destroy ${ip} in ${region}`);

            const ec2 = new AWS.EC2({
                region,
            });

            try {
                const description = await ec2.describeAddresses({
                    PublicIps: [ip],
                }).promise();

                const result = await ec2.releaseAddress({
                    AllocationId: description.Addresses[0].AllocationId
                }).promise();

                return {
                    ok: true,
                    region,
                    ip,
                    result,
                };
            } catch (err) {
                return {
                    ok: false,
                    region,
                    ip,
                    err,
                };
            }
        }
    },
    getNodesJSONs({ elasticIPs, buildNumber = circleCiBuildNumber() }, nodes = fixtures.nodes) {
        const commonProps = {
            sshPublicKey: '~/.ssh/id_rsa.pub',
            configPath: '../templates',
            incomingSshCidrBlocks: ["0.0.0.0/0"],
            awsProfile: 'default',
            nodeSize: 't2.medium',
            nodeCount: 0,
        };

        const regionIndexes = {};

        return nodes.map((node) => {
            let currentRegionIndex = 0;
            if (node.region in regionIndexes) {
                currentRegionIndex = regionIndexes[node.region];
                currentRegionIndex++;
                regionIndexes[node.region] = currentRegionIndex;
            } else {
                regionIndexes[node.region] = currentRegionIndex;
            }

            const { ip: publicIp } = elasticIPs
                .filter(({ region }) => region === node.region)[currentRegionIndex];
            
            node.name = node.name.replace('{circle_ci_build_number}', buildNumber);

            return Object.assign({}, node, commonProps, {
                publicIp
            });
        });
    },
    remoteExec({ command, ip }) {
        return exec(`ssh -o StrictHostKeyChecking=no ubuntu@${ip} '${command}'`);
    },
    async eventuallyReady(ip) {
        let pollCount = 0;
        let poll = true;

        let boyarFlag = false;
        let swarmLeaderFlag = false;

        do {
            console.log(`polling the cluster deployed service... [${pollCount}]`);
            console.log('IP: ', ip);

            // We test to see that Boyar is available in this manger node.
            const boyarCheck = await exec(`ssh -o StrictHostKeyChecking=no ubuntu@${ip} 'test -e /usr/bin/boyar'`);
            if (boyarCheck.exitCode === 0) {
                console.log('Boyar check has passed! Boyar exists on the manager node!');
                boyarFlag = true;
            }

            const swarmLeaderCheck = await exec(`ssh -o StrictHostKeyChecking=no ubuntu@${ip} 'sudo docker node ls | grep Leader | wc -l'`);
            if (trim(swarmLeaderCheck.stdout) === '1') {
                console.log('Swarm check passed! Found 1 leader in the cluster!');
                swarmLeaderFlag = true;
            }

            if (swarmLeaderFlag && boyarFlag) {
                return true;
            } else {
                pollCount++;
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }
        } while (poll && pollCount < 60);

        return false;
    },
    async checkEBSFingerprint({ outputs }) {
        const ip = outputs.find(o => o.key === 'ethereum.public_ip').value;
        const command = `cat /ethereum-persistency/.fingerprint`;
        const checkFingerprintResult = await this.remoteExec({ command, ip });

        if (checkFingerprintResult.exitCode !== 0) {
            return {
                ok: false,
                fingerprint: null,
                error: checkFingerprintResult.stderr,
            };
        }

        return {
            ok: true,
            error: null,
            fingerprint: trim(checkFingerprintResult.stdout),
        };
    }
};
