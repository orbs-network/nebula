const { prepareArgsForNebulaOps } = require('./common');
const { logRed, logGreen, ValidateIPaddress, getComposeFileOrFlagsHandler, } = require('./../methods');

const path = require('path');
const { Nebula } = require('./../../../lib/services/nebula');
const { Terraform } = require('./../../../lib/services/terraform');

function _create({ fileMode = false, __fileDirname = '', awsProfile, sshPublicKey: _sshPublicKey,
    orbsAddress, orbsPrivateKey, region, nodeSize, publicIp, nodeCount,
    cachePath: _catchPath, name, bootstrapUrl, backend = false,
    configPath: _configPath, chainVersion, ethereumEndpoint,
    ethereumTopologyContractAddress, incomingSshCidrBlocks,
    sslCertificatePath, sslPrivateKeyPath,
}) {
    let errorMessage;

    const params = prepareArgsForNebulaOps({
        fileMode, __fileDirname, _configPath, _sshPublicKey, _catchPath,
        chainVersion, ethereumTopologyContractAddress, sslCertificatePath, sslPrivateKeyPath,
        orbsAddress, orbsPrivateKey, awsProfile, incomingSshCidrBlocks, ethereumEndpoint,
        region, backend, nodeSize, nodeCount, bootstrapUrl, name,
    });

    if (publicIp !== false && publicIp !== '') {
        if (ValidateIPaddress(publicIp)) {
            params.cloud.ip = publicIp;
        } else {
            errorMessage = `The supplied IP address ${publicIp}
            is not a valid IPv4 address!`;
            logRed(errorMessage);
            throw new Error(errorMessage);
        }
    }

    return params;
}

async function create(params) {
    const { keys, cloud } = _create(params);

    let terraformAdapter = new Terraform();
    terraformAdapter.setCachePath(path.join(process.cwd(), '_terraform'));

    let nebula = new Nebula({terraformAdapter});
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
