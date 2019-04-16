const path = require('path');
const _ = require('lodash');
const { writeFileSync } = require('fs');
const { exec } = require('./../../utils/exec');

const { createBoyarConfig } = require('./../boyar/create-config');
const { logRed, logGreen, getComposeFileOrFlagsHandler } = require('./../methods');

function _update({ name, region, configPath: _configPath, chainVersion, awsProfile, ethereumTopologyContractAddress, fileMode = false, __fileDirname }) {
    let configPath = _configPath;

    if (!configPath) {
        logRed('Constellation cannot update due to an error!');
        logRed('No config path specified!');
        console.log('');
        logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
        logRed('please kindly open a GitHub issue here:');
        logRed('https://github.com/orbs-network/nebula');

        throw new Error('No config path specified!');
    }

    if (fileMode) {
        configPath = path.join(__fileDirname, _configPath);
    } else if (configPath.substr(0, 1) !== '/' && configPath.substr(0, 1) !== '~') {
        configPath = path.join(process.cwd(), configPath);
    }

    const boyarConfig = createBoyarConfig({
        configPath,
        chainVersion,
        skipNetworkTopology: !_.isEmpty(ethereumTopologyContractAddress)
    });
    const targetPath = 'boyar/config.json';
    const boyarBucketName = `boyar-${name}`;

    const tempFileName = `/tmp/${boyarBucketName}.config.json-${Date.now()}`;
    const profile = _.isEmpty(awsProfile) ? "" : `--profile ${awsProfile}`;
    const command = `aws s3 cp --region ${region} --acl public-read ${profile} ${tempFileName} s3://${boyarBucketName}/${targetPath}`;

    return {
        tempFileName,
        boyarConfig,
        command,
    }
}

async function update(params) {
    const { tempFileName, boyarConfig, command } = _update();

    console.log('Writing new bootstrap config to', tempFileName);
    writeFileSync(tempFileName, JSON.stringify(boyarConfig, 2, 2));
    const execReturnValue = await exec(command);

    if (execReturnValue.exitCode !== 0) {
        logRed('Constellation cannot update due to an error!');
        logRed(execReturnValue.stderr);
        console.log('');
        logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
        logRed('please kindly open a GitHub issue here:');
        logRed('https://github.com/orbs-network/nebula');

        throw execReturnValue.stderr;
    }

    logGreen('Your constellation was updated successfully!');

    return {
        ok: true,
        result: execReturnValue,
    };
}

module.exports = {
    update: getComposeFileOrFlagsHandler(update),
    _update,
};
