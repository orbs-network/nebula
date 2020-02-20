const _ = require('lodash');

const { createBoyarConfig } = require('./../boyar/create-config');
const { logRed, logGreen, ValidateIPaddress, getComposeFileOrFlagsHandler, } = require('./../methods');
const types = require('./../../../constants/types');
const { Nebula } = require('./../../../lib/services/nebula');
const { resolvePath } = require("../../utils/resolve-path");

function _create({ fileMode = false, __fileDirname = '', awsProfile, sshPublicKey: _sshPublicKey,
    orbsAddress, orbsPrivateKey, region, nodeSize, publicIp, nodeCount,
    cachePath: _catchPath, name, bootstrapUrl,
    configPath: _configPath, chainVersion, ethereumEndpoint,
    ethereumTopologyContractAddress, incomingSshCidrBlocks,
    sslCertificatePath, sslPrivateKeyPath,
}) {
    let errorMessage;
    let configPath = _configPath;
    let boyarConfig = {};
    let sshPublicKey = _sshPublicKey;
    let cachePath = _catchPath;

    // Expand cache path
    if (cachePath !== undefined) {
        cachePath = resolvePath(cachePath, fileMode ? __fileDirname : process.cwd());
    } else {
        cachePath = resolvePath("~/.nebula");
    }

    // Expand SSH public key path
    if (fileMode) {
        sshPublicKey = resolvePath(sshPublicKey, __fileDirname);
    }

    if (!_.isEmpty(configPath)) {
        configPath = resolvePath(_configPath, fileMode ? __fileDirname : process.cwd());

        // do not generate boyar config if configPath is missing
        boyarConfig = createBoyarConfig({
            configPath,
            chainVersion,
            skipNetworkTopology: !_.isEmpty(ethereumTopologyContractAddress)
        });
    }

    if (!_.isEmpty(sslCertificatePath)) {
        sslCertificatePath = resolvePath(sslCertificatePath, __fileDirname);
    }

    if (!_.isEmpty(sslPrivateKeyPath)) {
        sslPrivateKeyPath = resolvePath(sslPrivateKeyPath, __fileDirname);
    }

    if (orbsAddress.length !== 40) {
        errorMessage = `Invalid Orbs node address, required hex of 40 characters
        Got: ${orbsAddress} (Length: ${orbsAddress.length})
        `;
        logRed(errorMessage);
        throw new Error(errorMessage);
    }

    if (orbsPrivateKey.length !== 64) {
        errorMessage = `Invalid Orbs private key, required hex of 64 characters
        Got: ${orbsPrivateKey} (Length: ${orbsPrivateKey.length})`;
        logRed(errorMessage);
        throw new Error(errorMessage);
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
            ethereumTopologyContractAddress,
            ethereumEndpoint,
        },
        ssl: {
            sslCertificatePath,
            sslPrivateKeyPath,
        }
    };

    const cloud = {
        type: types.clouds.aws,
        region,
        instanceType: nodeSize,
        nodeCount: nodeCount,
        bootstrapUrl,
        cachePath,
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
            throw new Error(errorMessage);
        }
    }

    return { keys, cloud };
}

async function create(params) {
    const { keys, cloud } = _create(params);

    const nebula = new Nebula();
    nebula.setTerraformCachePath(cloud.cachePath);
    try {
        const result = await nebula.createConstellation({cloud, keys});
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

        if (params.fileMode) {
            console.log(`nebula update -f ${params._file}`);
            console.log(`nebula destroy -f ${params._file}`);
        } else {
            console.log(`nebula destroy --name ${result.name}`);
        }

        console.log('');
        logGreen('Please allow time now for your constellation to finish syncing with the Orbs network');
        logGreen('No further actions required at this point');

        return result;
    } catch (err) {

        logRed('Your constelation was not created successfully!');
        logRed(`with error message as follows: ${err.message}`);
        logRed('Please follow the inline messages from Terraform to find out why');

        if ('tfPath' in err) {
            console.log('');
            logRed('More information on debugging errors can be found by running the same commands');
            logRed('that Nebula runs within your compiled Terraform infrastructure folder located at:');
            logRed(err.tfPath);
        }

        console.log('');
        logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
        logRed('please kindly open a GitHub issue here: ');
        logRed('https://github.com/orbs-network/nebula');

        throw err;
    }
}

module.exports = {
    create: getComposeFileOrFlagsHandler(create),
    _create: _create,
};
