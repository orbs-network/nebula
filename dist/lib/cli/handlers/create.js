"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const create_config_1 = require("../boyar/create-config");
const methods_1 = require("../methods");
const types_1 = __importDefault(require("../../../constants/types"));
const nebula_1 = require("../../../lib/services/nebula");
const resolve_path_1 = require("../../utils/resolve-path");
function _create({ fileMode = false, __fileDirname = '', awsProfile, sshPublicKey: _sshPublicKey, orbsAddress, orbsPrivateKey, region, nodeSize, publicIp, nodeCount, cachePath: _catchPath, name, bootstrapUrl, configPath: _configPath, chainVersion, ethereumEndpoint, ethereumTopologyContractAddress, incomingSshCidrBlocks, sslCertificatePath, sslPrivateKeyPath, }) {
    let errorMessage;
    let configPath = _configPath;
    let boyarConfig = {};
    let sshPublicKey = _sshPublicKey;
    let cachePath = _catchPath;
    // Expand cache path
    if (cachePath !== undefined) {
        cachePath = resolve_path_1.resolvePath(cachePath, fileMode ? __fileDirname : process.cwd());
    }
    else {
        cachePath = resolve_path_1.resolvePath("~/.nebula");
    }
    // Expand SSH public key path
    if (fileMode) {
        sshPublicKey = resolve_path_1.resolvePath(sshPublicKey, __fileDirname);
    }
    if (!lodash_1.default.isEmpty(configPath)) {
        configPath = resolve_path_1.resolvePath(_configPath, fileMode ? __fileDirname : process.cwd());
        // do not generate boyar config if configPath is missing
        boyarConfig = create_config_1.createBoyarConfig({
            configPath,
            chainVersion,
            skipNetworkTopology: !lodash_1.default.isEmpty(ethereumTopologyContractAddress)
        });
    }
    if (!lodash_1.default.isEmpty(sslCertificatePath)) {
        sslCertificatePath = resolve_path_1.resolvePath(sslCertificatePath, __fileDirname);
    }
    if (!lodash_1.default.isEmpty(sslPrivateKeyPath)) {
        sslPrivateKeyPath = resolve_path_1.resolvePath(sslPrivateKeyPath, __fileDirname);
    }
    if (orbsAddress.length !== 40) {
        errorMessage = `Invalid Orbs node address, required hex of 40 characters
        Got: ${orbsAddress} (Length: ${orbsAddress.length})
        `;
        methods_1.logRed(errorMessage);
        throw new Error(errorMessage);
    }
    if (orbsPrivateKey.length !== 64) {
        errorMessage = `Invalid Orbs private key, required hex of 64 characters
        Got: ${orbsPrivateKey} (Length: ${orbsPrivateKey.length})`;
        methods_1.logRed(errorMessage);
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
        type: types_1.default.clouds.aws,
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
        if (methods_1.ValidateIPaddress(publicIp)) {
            cloud.ip = publicIp;
        }
        else {
            errorMessage = `The supplied IP address ${publicIp}
            is not a valid IPv4 address!`;
            methods_1.logRed(errorMessage);
            throw new Error(errorMessage);
        }
    }
    return { keys, cloud };
}
async function create(params) {
    const { keys, cloud } = _create(params);
    const nebula = new nebula_1.Nebula();
    nebula.setTerraformCachePath(cloud.cachePath);
    const result = await nebula.createConstellation({ cloud, keys });
    if (result.ok === true) {
        const managerIP = ('ip' in cloud) ? cloud.ip : result.manager.ip;
        methods_1.logGreen('Your constellation was created successfully!');
        methods_1.logGreen("Provided below is the address of your manager node public IP");
        methods_1.logGreen(`The manager IPv4 is: ${managerIP}`);
        console.log('');
        methods_1.logGreen('Your constellation name should be used when wanting to destroy/upgrade');
        methods_1.logGreen('Constellation name:');
        methods_1.logGreen(result.name);
        console.log('');
        console.log('Example usage:');
        if (params.fileMode) {
            console.log(`nebula update -f ${params._file}`);
            console.log(`nebula destroy -f ${params._file}`);
        }
        else {
            console.log(`nebula destroy --name ${result.name}`);
        }
        console.log('');
        methods_1.logGreen('Please allow time now for your constellation to finish syncing with the Orbs network');
        methods_1.logGreen('No further actions required at this point');
        return result;
    }
    else {
        methods_1.logRed('Your constelation was not created successfully!');
        methods_1.logRed(`with error message as follows: ${result.message}`);
        methods_1.logRed('Please follow the inline messages from Terraform to find out why');
        if ('tfPath' in result) {
            console.log('');
            methods_1.logRed('More information on debugging errors can be found by running the same commands');
            methods_1.logRed('that Nebula runs within your compiled Terraform infrastructure folder located at:');
            methods_1.logRed(result.tfPath);
        }
        console.log('');
        methods_1.logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
        methods_1.logRed('please kindly open a GitHub issue here: ');
        methods_1.logRed('https://github.com/orbs-network/nebula');
        return Promise.reject(result);
    }
}
exports.default = {
    create: methods_1.getComposeFileOrFlagsHandler(create),
    _create: _create,
};
//# sourceMappingURL=create.js.map