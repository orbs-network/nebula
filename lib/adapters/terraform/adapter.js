// This is the production ready adatper that actually communicates with the real Terraform
// binary

const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const { spawn } = require('child_process');
const path = require('path');
const { exec } = require('../../utils/exec');
const { flatMap } = require('lodash');

const outputs = {};
function log(text, name, op, stdType = 'out') {
    if (!outputs[name]) {
        outputs[name] = {
            name,
            ops: {}
        };
    }

    const element = outputs[name];

    if (op in element.ops) {
        element.ops[op][stdType].push(text);
    } else {
        element.ops[op] = {
            out: [],
            err: []
        };
        element.ops[op][stdType].push(text);
    }
};

const adapter = {
    outputs,
    async createSpinContextDirectory({ target }) {
        return exec(`mkdir -p ${target}`);
    },
    remoteExec({ command, ip }) {
        return exec(`ssh -o StrictHostKeyChecking=no ubuntu@${ip} '${command}'`);
    },
    writeFile,
    async copyInfraBaseTemplate({ sourcePath, targetPath }) {
        return exec(`cp -R ${sourcePath}/* ${targetPath} && rm -f ${path.join(targetPath, 'eip.tf')} && rm -f ${path.join(targetPath, 'ethereum-ebs*')}`, { cwd: sourcePath });
    },
    async copyInfraEipTemplate({ sourcePath, targetPath }) {
        return exec(`cp ${sourcePath}/eip.tf ${targetPath} && touch ${path.join(targetPath, '.eip')}`, { cwd: sourcePath });
    },
    async copyInfraEbsTemplate({ sourcePath, targetPath }) {
        return exec(`cp ${sourcePath}/ethereum-ebs.tf ${targetPath}`, { cwd: sourcePath });
    },
    async copyInfraEbsTemplateForImport({ sourcePath, targetPath }) {
        return exec(`cp ${sourcePath}/ethereum-ebs-import.tf ${targetPath} && touch ${path.join(targetPath, '.ethebs')}`, { cwd: sourcePath });
    },
    async copySwarmStackScripts({ sourcePath, targetPath }) {
        return exec(`cp ${sourcePath} ${targetPath}`);
    },
    init({ spinContext, targetPath }) {
        return new Promise((resolve, reject) => {
            const tfInitSpawn = spawn('terraform', ['init'], {
                cwd: targetPath,
            });

            tfInitSpawn.stdout.on('data', (data) => {
                log(data.toString(), spinContext, 'init');
            });

            tfInitSpawn.stderr.on('data', (data) => {
                log(data.toString(), spinContext, 'init', 'err');
            });

            tfInitSpawn.on('close', (code) => {
                if (code === 0) {
                    resolve({ code });
                    return;
                }
                reject({ code });
            });
        })
    },
    importExistingIp({ spinContext, targetPath, cloud }) {
        return new Promise((resolve, reject) => {
            const tfImportSpawn = spawn('terraform', ['import', 'aws_eip.eip_manager', cloud.ip], {
                cwd: targetPath,
            });

            tfImportSpawn.stdout.on('data', (data) => {
                log(data.toString(), spinContext, 'import-ip');
            });

            tfImportSpawn.stderr.on('data', (data) => {
                log(data.toString(), spinContext, 'import-ip', 'err');
            });

            tfImportSpawn.on('close', (code) => {
                if (code === 0) {
                    resolve({ code });
                    return;
                }
                reject({ code });
            });
        })
    },
    apply({ spinContext, targetPath, stdoutHandler, varsObject }) {
        return new Promise((resolve, reject) => {
            const vars = flatMap(varsObject, (value, key) => {
                return ['-var', `${key}=${value}`];
            });

            const tfApplySpawn = spawn('terraform', ['apply', '-var-file=terraform.tfvars', '-auto-approve', ...vars], {
                cwd: targetPath,
            });

            tfApplySpawn.stdout.on('data', (data) => {
                const dataAsString = data.toString();
                // I don't write just apply since it's a reserved js method
                log(data.toString(), spinContext, 'tf-apply');
                stdoutHandler(dataAsString);
            });

            tfApplySpawn.stderr.on('data', (data) => {
                log(data.toString(), spinContext, 'tf-apply', 'err');
            });

            tfApplySpawn.on('close', (code) => {
                if (code === 0) {
                    resolve({ code });
                    return;
                }
                reject({ code });
            });
        })
    },
    checkFileExists(targetPath) {
        return fs.existsSync(targetPath);
    },
    detachElasticIPFromTerraformState({ targetPath }) {
        return exec('terraform state rm aws_eip.eip_manager', {
            cwd: targetPath,
        });
    },
    destroy({ targetPath, spinContext }) {
        return new Promise((resolve, reject) => {
            const tfDestroySpawn = spawn('terraform', ['destroy', '-var-file=terraform.tfvars', '-auto-approve'], {
                cwd: targetPath,
            });

            tfDestroySpawn.stdout.on('data', (data) => {
                log(data.toString(), spinContext, 'tf-destroy');
            });

            tfDestroySpawn.stderr.on('data', (data) => {
                log(data.toString(), spinContext, 'tf-destroy', 'err');
            });

            tfDestroySpawn.on('close', (code) => {
                if (code === 0) {
                    resolve({ code });
                    return;
                }
                reject({ code });
            });
        });
    },
};

module.exports = adapter;
