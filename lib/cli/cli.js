const path = require('path');
const _ = require('lodash');

const { logRed, logGreen, ValidateIPaddress, resolveHome, } = require('./methods');
const types = require('./../../constants/types');
const { CoreService } = require('./../services/core/core');
const { TerraformService } = require('./../services/terraform/terraform');
const terraformProdAdapter = require('./../adapters/terraform/adapter');
const { coreAdapter } = require('../adapters/core/adapter');
const { getEndpoint, getStatus } = require("../metrics");
const { readFileSync, writeFileSync } = require("fs");
const { exec } = require("shelljs");

const c = new CoreService(new TerraformService(terraformProdAdapter), coreAdapter);

function readJSON(path) {
    return JSON.parse(readFileSync(path).toString());
}

function updateVersionForAllVchains(chains, chainVersion) {
    _.each(chains, (chain) => {
        chain.DockerConfig.Tag = chainVersion;
    });
}

function updateVersionPerChain(chains, chainVersion) {
    _.each(chains, (chain) => {
        const proposedVersion = chainVersion[chain.Id];
        if (!_.isEmpty(proposedVersion)) {
            chain.DockerConfig.Tag = proposedVersion;
        }
    });
}

function setBenchmarkConsensusLeaderForAllVchains(chains, leader) {
    _.each(chains, (chain) => {
        chain.Config["benchmark-consensus-constant-leader"] = leader;
    });
}

function setNetworkTopology(boyarConfig, nodeKeys, ips) {
    boyarConfig.network = _.map(nodeKeys, (keys, region) => {
        return {
            "address": keys.address,
            "ip": ips[region],
        };
    });
}

function createBoyarConfig({ configPath: _configPath, chainVersion }) {
    const configPath = resolveHome(_configPath);

    const nodeKeys = readJSON(`${configPath}/keys.json`);
    const ips = readJSON(`${configPath}/ips.json`);
    const boyarConfig = readJSON(`${configPath}/boyar.json`);

    setNetworkTopology(boyarConfig, nodeKeys, ips);

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

async function create(argv) {
    let _argv = {};

    if (argv.file !== undefined && argv.file !== '') {
        try {
            let pathToRequire = resolveHome(argv.file);
            if (pathToRequire.substr(0, 1) !== '/') {
                pathToRequire = path.join(process.cwd(), pathToRequire);
            }

            argsAsFile = require(pathToRequire);
            argsAsFile._file = argv.file;
            argsAsFile.fileMode = true;
            argsAsFile.__fileDirname = path.dirname(pathToRequire);
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

async function _create({ fileMode = false, __fileDirname = '', awsProfile, sshPublicKey, orbsAddress, orbsPrivateKey, region,
    nodeSize, publicIp, noEthereum = false, nodeCount, name, configPath: _configPath, chainVersion, _file }) {
    let errorMessage;
    let configPath = _configPath;

    if (fileMode) {
        configPath = path.join(__fileDirname, _configPath);
    } else if (configPath.substr(0, 1) !== '/' && configPath.substr(0, 1) !== '~') {
        configPath = path.join(process.cwd(), configPath);
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

        if (fileMode) {
            console.log(`nebula update -f ${_file}`);
            console.log(`nebula destroy -f ${_file}`);
        } else {
            console.log(`nebula destroy --name ${result.spinContext}`);
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

async function destroy(argv) {
    let _argv = {};

    if (argv.file !== undefined && argv.file !== '') {
        try {
            let pathToRequire = resolveHome(argv.file);
            if (pathToRequire.substr(0, 1) !== '/') {
                pathToRequire = path.join(process.cwd(), pathToRequire);
            }

            argsAsFile = require(pathToRequire);
            argsAsFile.fileMode = true;
            argsAsFile.__fileDirname = path.dirname(pathToRequire);
        } catch (err) {
            logRed('Problem opening your arguments file!');
            logRed(err);
            process.exit(1);
        }

        _argv = argsAsFile;
    } else {
        _argv = argv;
    }

    return _destroy(_argv);
}

async function _destroy({ name }) {
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

async function update(argv) {
    let _argv = {};

    if (argv.file !== undefined && argv.file !== '') {
        try {
            let pathToRequire = resolveHome(argv.file);
            if (pathToRequire.substr(0, 1) !== '/') {
                pathToRequire = path.join(process.cwd(), pathToRequire);
            }

            argsAsFile = require(pathToRequire);
            argsAsFile.fileMode = true;
            argsAsFile.__fileDirname = path.dirname(pathToRequire);
        } catch (err) {
            logRed('Problem opening your arguments file!');
            logRed(err);
            process.exit(1);
        }

        _argv = argsAsFile;
    } else {
        _argv = argv;
    }

    return _update(_argv);
}

async function _update({ name, region, configPath: _configPath, chainVersion, awsProfile, fileMode = false, __fileDirname }) {
    let configPath = _configPath;

    if (fileMode) {
        configPath = path.join(__fileDirname, _configPath);
    } else if (configPath.substr(0, 1) !== '/' && configPath.substr(0, 1) !== '~') {
        configPath = path.join(process.cwd(), configPath);
    }

    const boyarConfig = createBoyarConfig({ configPath, chainVersion });
    const targetPath = 'boyar/config.json';
    const boyarBucketName = `boyar-${name}`;

    const tempFileName = `/tmp/${boyarBucketName}.config.json-${Date.now()}`;
    writeFileSync(tempFileName, JSON.stringify(boyarConfig, 2, 2));

    // Revert to direct execution because S3 SDK is garbage and doesn't work for me on AWS for some reason
    const profile = _.isEmpty(awsProfile) ? "" : `--profile ${awsProfile}`;
    const execReturnValue = exec(`aws s3 cp --region ${region} --acl public-read ${profile} ${tempFileName} s3://${boyarBucketName}/${targetPath}`);

    if (execReturnValue.code != 0) {
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

function getNodes({ configPath }) {
    return require(`${configPath}/ips.json`);
}

async function status({ configPath, vchain }) {
    if (!configPath || !vchain) {
        return {
            ok: false
        }
    }

    const ips = _.mapValues(getNodes({ configPath }), (ip) => {
        return getEndpoint(ip, vchain);
    });
    const result = await getStatus(ips, 1000, 15000);

    _.each(result, (data, name) => {
        const color = data.status == "green" ? logGreen : logRed;
        color(`${name} ${data.status} blockHeight=${data.blockHeight} version=${data.version}@${_.truncate(data.commit, {length: 8, omission: ''})}`);
    });

    return {
        ok: true,
        result,
    }
}

function bootstrapConfig({ configPath: _configPath }) {
    let configPath = _configPath;

    if (!configPath) {
        return {
            ok: false
        }
    }

    const boyarConfig = createBoyarConfig({ configPath });    
    console.log(JSON.stringify(boyarConfig, 2, 2));

    return {
        ok: true,
        result: boyarConfig,
    }
}

module.exports = {
    create,
    destroy,
    update,
    status,
    createBoyarConfig,
    getNodes,
    bootstrapConfig
};
