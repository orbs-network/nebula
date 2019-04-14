const path = require('path');
const _ = require('lodash');

const { createBoyarConfig } = require('./../boyar/create-config');
const { logRed, logGreen, ValidateIPaddress, getComposeFileOrFlagsHandler, } = require('./../methods');
const types = require('./../../../constants/types');
const { Nebula } = require('./../../../lib/services/nebula');

async function create({ fileMode = false, __fileDirname = '', awsProfile, sshPublicKey: _sshPublicKey,
    orbsAddress, orbsPrivateKey, region, nodeSize, publicIp, noEthereum = false, nodeCount,
    cachePath: _catchPath, name, bootstrapUrl,
    configPath: _configPath, chainVersion, _file, ethereumChain, ethereumEndpoint,
    ethereumTopologyContractAddress, incomingSshCidrBlocks }) {
    let errorMessage;
    let configPath = _configPath;
    let boyarConfig = {};
    let sshPublicKey = _sshPublicKey;
    let cachePath = _catchPath;

    const nebula = new Nebula();

    // Expand cache path
    if (cachePath !== undefined) {
        if (fileMode) {
            cachePath = path.join(__fileDirname, cachePath);
        } else if (cachePath.substr(0, 1) !== '/' && cachePath.substr(0, 1) !== '~') {
            cachePath = path.join(process.cwd(), cachePath);
        }

        nebula.setTerraformCachePath(cachePath);
    }

    // Expand SSH public key path
    let sshKeyBasePath = process.cwd();

    if (fileMode) {
        sshKeyBasePath = __fileDirname;
        if (sshPublicKey.substr(0, 1) !== '/' && sshPublicKey.substr(0, 1) !== '~') {
            sshPublicKey = path.join(sshKeyBasePath, sshPublicKey);
        }
    }

    if (!_.isEmpty(configPath)) {
        if (fileMode) {
            configPath = path.join(__fileDirname, _configPath);
        } else if (configPath.substr(0, 1) !== '/' && configPath.substr(0, 1) !== '~') {
            configPath = path.join(process.cwd(), configPath);
        }

        // do not generate boyar config if configPath is missing
        boyarConfig = createBoyarConfig({
            configPath,
            chainVersion,
            skipNetworkTopology: !_.isEmpty(ethereumTopologyContractAddress)
        });
    }

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

    const keys = {
        aws: {
            profile: awsProfile,
        },
        ssh: {
            path: sshPublicKey,
            cidr: incomingSshCidrBlocks,
        },
        orbs: {
            nodeKeys: {
                address: orbsAddress,
                privateKey: orbsPrivateKey,
            },
            boyarConfig,
            ethereum: !noEthereum,
            ethereumChain,
            ethereumTopologyContractAddress,
            ethereumEndpoint,
        }
    };

    const cloud = {
        type: types.clouds.aws,
        region,
        instanceType: nodeSize,
        nodeCount: nodeCount,
        bootstrapUrl,
    };

    if (name !== '' && name.length > 0) {
        cloud.name = name;
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

    const result = await nebula.createConstellation({ cloud, keys });

    if (result.ok === true) {
        const managerIP = ('ip' in cloud) ? cloud.ip : result.manager.ip;

        logGreen('Your constellation was created successfully!');
        logGreen("Provided below is the address of your manager node public IP");
        logGreen(`The manager IPv4 is: ${managerIP}`);
        console.log('');
        logGreen('Your constellation name should be used when wanting to destroy/upgrade');
        logGreen('Constellation name:');
        logGreen(result.name);
        console.log('');
        console.log('Example usage:');

        if (fileMode) {
            console.log(`nebula update -f ${_file}`);
            console.log(`nebula destroy -f ${_file}`);
        } else {
            console.log(`nebula destroy --name ${result.name}`);
        }

        console.log('');
        logGreen('Please allow time now for your constellation to finish syncing with the Orbs network');
        logGreen('No further actions required at this point');

        return result;
    } else {
        logRed('Your constelation was not created successfully!');
        logRed(`with error message as follows: ${result.message}`);
        logRed('Please follow the inline messages from Terraform to find out why');

        if ('tfPath' in result) {
            console.log('');
            logRed('More information on debugging errors can be found by running the same commands');
            logRed('that Nebula runs within your compiled Terraform infrastructure folder located at:');
            logRed(result.tfPath);
        }

        console.log('');
        logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
        logRed('please kindly open a GitHub issue here: ');
        logRed('https://github.com/orbs-network/nebula');

        return Promise.reject(result);
    }
}

module.exports = {
    create: getComposeFileOrFlagsHandler(create)
};