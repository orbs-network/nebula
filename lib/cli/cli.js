const path = require('path');

const _ = require('lodash');

const { logRed, logGreen, ValidateIPaddress, resolveHome, } = require('./methods');
const types = require('./../../constants/types');
const { CoreService } = require('./../services/core/core');
const { TerraformService } = require('./../services/terraform/terraform');
const terraformProdAdapter = require('./../adapters/terraform/adapter');
const { coreAdapter } = require('../adapters/core/adapter');

const c = new CoreService(new TerraformService(terraformProdAdapter), coreAdapter);

function createBoyarConfig({ configPath: _configPath, chainVersion }) {
    const configPath = resolveHome(_configPath);

    const nodeKeys = require(`${configPath}/keys.json`);
    const ips = require(`${configPath}/ips.json`);
    const boyarConfig = require(`${configPath}/boyar.json`);

    boyarConfig.network = _.map(nodeKeys, (keys, region) => {
        return {
            "address": keys.address,
            "ip": ips[region],
        };
    });

    _.each(boyarConfig.chains, (chain) => {
        chain.Config["benchmark-consensus-constant-leader"] = nodeKeys[_.keys(nodeKeys)[0]].address;
    });

    if (!_.isEmpty(chainVersion)) {
        _.each(boyarConfig.chains, (chain) => {
            chain.DockerConfig.Tag = chainVersion
        });
    }

    return boyarConfig;
}

async function create(argv) {
    let _argv = {};

    if (argv.file !== '') {
        try {
            let pathToRequire = resolveHome(argv.file);
            if (pathToRequire.substr(0, 1) !== '/') {
                pathToRequire = path.join(process.cwd(), pathToRequire);
            }
            argsAsFile = require(pathToRequire);
        } catch (err) {
            logRed('Problem opening your arguments file!');
            logRed(err);
            process.exit(1);
        }

        _argv = argsAsFile;
    } else {
        _argv = argv;
    }

    return _create(_argv);
}

async function _create({ awsProfile, sshPublicKey, orbsAddress, orbsPrivateKey, region,
    nodeSize, publicIp, noEthereum = false, nodeCount, name, configPath, chainVersion }) {
    let errorMessage;

    if (orbsAddress.length !== 40) {
        errorMessage = `Invalid Orbs node address, required hex of 40 characters
        Got: ${orbsAddress} (Length: ${orbsAddress.length})
        `;
        logRed(errorMessage);
        return Promise.reject({
            ok: false,
            errorMessage,
        });
    }

    if (orbsPrivateKey.length !== 64) {
        errorMessage = `Invalid Orbs private key, required hex of 64 characters
        Got: ${orbsPrivateKey} (Length: ${orbsPrivateKey.length})`;
        logRed(errorMessage);
        return Promise.reject({
            ok: false,
            errorMessage,
        });
    }

    const boyarConfig = createBoyarConfig({
        configPath,
        chainVersion
    });

    const keys = {
        aws: {
            profile: awsProfile,
        },
        ssh: {
            path: sshPublicKey,
        },
        orbs: {
            nodeKeys: {
                address: orbsAddress,
                privateKey: orbsPrivateKey,
            },
            boyarConfig,
            ethereum: !noEthereum,
        }
    };

    const cloud = {
        type: types.clouds.aws,
        region,
        instanceType: nodeSize,
        nodeCount: nodeCount,
    };

    if (name !== '' && name.length > 0) {
        cloud.spinContext = name;
    }

    if (publicIp !== false && publicIp !== '') {
        if (ValidateIPaddress(publicIp)) {
            cloud.ip = publicIp;
        } else {
            errorMessage = `The supplied IP address ${publicIp}
            is not a valid IPv4 address!`;
            logRed(errorMessage);
            return Promise.reject({
                ok: false,
                errorMessage,
            });
        }
    }

    const result = await c.createConstellation({ cloud, keys });
    //const result = { ok: true, manager: { ip: '1.2.3.4' }, spinContext: 'itamar' };

    if (result.ok === true) {
        const managerIP = ('ip' in cloud) ? cloud.ip : result.manager.ip;

        logGreen('Your constellation was created successfully!');
        logGreen("Provided below is the address of your manager node public IP");
        logGreen(`The manager IPv4 is: ${managerIP}`);
        console.log('');
        logGreen('Your constellation name should be used when wanting to destroy/upgrade');
        logGreen('Constellation name:');
        logGreen(result.spinContext);
        console.log('');
        console.log('Example usage:');
        console.log(`nebula destroy --name ${result.spinContext}`);
        console.log('');
        logGreen('Please allow time now for your constellation to finish syncing with the Orbs network');
        logGreen('No further actions required at this point');

        return result;
    } else {
        logRed('Your constelation was not created successfully!');
        logRed(`with error message as follows: ${result.message}`);
        logRed('Please follow the inline messages from Terraform to find out why');
        logRed('More information on debugging errors can be found by running the same commands');
        logRed('that Nebula runs within your compiled Terraform infrastructure folder located at:');
        logRed(result.tfPath);
        console.log('');
        logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
        logRed('please kindly open a GitHub issue here: ');
        logRed('https://github.com/orbs-network/nebula');

        return Promise.reject(result);
    }
}

async function destroy({ name }) {
    const destroyResult = await c.destroyConstellation({ spinContext: name });

    if (destroyResult.ok === true) {
        logGreen('Your constellation has been successfully destroyed!');
        return destroyResult;
    } else {
        logRed('Could not destroy constellation!');
        logRed(destroyResult.error);
        console.log('');
        logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
        logRed('please kindly open a GitHub issue here:');
        logRed('https://github.com/orbs-network/nebula');
        return Promise.reject(destroyResult);
    }
}

// FIXME add reliable method to get a bucket name
async function update({ name, configPath, chainVersion, awsProfile }) {
    const boyarConfig = createBoyarConfig({ configPath, chainVersion });
    const tmpPath = `/tmp/${name}.boyar.json`;
    writeFile(tmpPath, JSON.stringify(boyarConfig));

    const profile = _.isEmpty(awsProfile) ? "" : `--profile ${awsProfile}`
    const command = `aws s3 cp --acl public-read ${tmpPath} ${profile} s3://${cloud.bucketPrefix}-${region}/boyar/config.json`;
    console.log(command);
}

module.exports = {
    create,
    destroy,
    update
};