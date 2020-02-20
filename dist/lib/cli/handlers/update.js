"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = require("fs");
const exec_1 = require("../../utils/exec");
const create_config_1 = require("../boyar/create-config");
const methods_1 = require("../methods");
function _update({ name, region, configPath: _configPath, chainVersion, awsProfile, ethereumTopologyContractAddress, fileMode = false, __fileDirname }) {
    let configPath = _configPath;
    if (!configPath) {
        methods_1.logRed('Constellation cannot update due to an error!');
        methods_1.logRed('No config path specified!');
        console.log('');
        methods_1.logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
        methods_1.logRed('please kindly open a GitHub issue here:');
        methods_1.logRed('https://github.com/orbs-network/nebula');
        throw new Error('No config path specified!');
    }
    if (fileMode) {
        configPath = path_1.default.join(__fileDirname, _configPath);
    }
    else if (configPath.substr(0, 1) !== '/' && configPath.substr(0, 1) !== '~') {
        configPath = path_1.default.join(process.cwd(), configPath);
    }
    const boyarConfig = create_config_1.createBoyarConfig({
        configPath,
        chainVersion,
        skipNetworkTopology: !lodash_1.default.isEmpty(ethereumTopologyContractAddress)
    });
    const targetPath = 'boyar/config.json';
    const boyarBucketName = `boyar-${name}`;
    const tempFileName = `/tmp/${boyarBucketName}.config.json-${Date.now()}`;
    const profile = (lodash_1.default.isEmpty(awsProfile) || awsProfile === 'default') ? '' : `--profile ${awsProfile}`;
    const command = `aws s3 cp --region ${region} --acl public-read ${profile} ${tempFileName} s3://${boyarBucketName}/${targetPath}`;
    console.log(command);
    return {
        tempFileName,
        boyarConfig,
        command,
    };
}
async function update(params) {
    const { tempFileName, boyarConfig, command } = _update(params);
    console.log('Writing new bootstrap config to', tempFileName);
    fs_1.writeFileSync(tempFileName, JSON.stringify(boyarConfig, 2, 2));
    const execReturnValue = await exec_1.exec(command);
    if (execReturnValue.exitCode !== 0) {
        methods_1.logRed('Constellation cannot update due to an error!');
        methods_1.logRed(execReturnValue.stderr);
        console.log('');
        methods_1.logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
        methods_1.logRed('please kindly open a GitHub issue here:');
        methods_1.logRed('https://github.com/orbs-network/nebula');
        throw execReturnValue.stderr;
    }
    methods_1.logGreen('Your constellation was updated successfully!');
    return {
        ok: true,
        result: execReturnValue,
    };
}
exports.default = {
    update: methods_1.getComposeFileOrFlagsHandler(update),
    _update,
};
//# sourceMappingURL=update.js.map