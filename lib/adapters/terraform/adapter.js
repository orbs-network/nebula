// This is the production ready adatper that actually communicates with the real Terraform
// binary

const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const { spawn } = require('child_process');
const path = require('path');
const { exec } = require('../../utils/exec');

const adapter = {
    async createSpinContextDirectory({ target }) {
        return exec(`mkdir -p ${target}`);
    },
    writeFile,
    async copyInfraBaseTemplate({ sourcePath, targetPath }) {
        return exec(`cp -R ${sourcePath}/* ${targetPath} && rm -f ${path.join(targetPath, 'eip.tf')}`, { cwd: sourcePath });
    },
    async copyInfraEipTemplate({ sourcePath, targetPath }) {
        return exec(`cp ${sourcePath}/eip.tf ${targetPath} && touch ${path.join(targetPath, '.eip')}`, { cwd: sourcePath });
    },
    async copySwarmStackScripts({ sourcePath, targetPath }) {
        return exec(`cp ${sourcePath} ${targetPath}`);
    },
    init({ targetPath }) {
        return new Promise((resolve, reject) => {
            const tfInitSpawn = spawn('terraform', ['init'], {
                cwd: targetPath,
            });

            tfInitSpawn.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            tfInitSpawn.stderr.on('data', (data) => {
                console.log(`stderr: ${data}`);
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
    importExistingIp({ targetPath, cloud }) {
        return new Promise((resolve, reject) => {
            const tfImportSpawn = spawn('terraform', ['import', 'aws_eip.eip_manager', cloud.ip], {
                cwd: targetPath,
            });

            tfImportSpawn.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            tfImportSpawn.stderr.on('data', (data) => {
                console.log(`stderr: ${data}`);
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
    plan({ targetPath }) {
        return new Promise((resolve, reject) => {
            const tfPlanSpawn = spawn('terraform', ['plan', '-var-file=terraform.tfvars'], {
                cwd: targetPath,
            });

            tfPlanSpawn.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            tfPlanSpawn.stderr.on('data', (data) => {
                console.log(data.toString());
            });

            tfPlanSpawn.on('close', (code) => {
                if (code === 0) {
                    resolve({ code });
                    return;
                }
                reject({ code });
            });
        })
    },
    apply({ targetPath, stdoutHandler }) {
        return new Promise((resolve, reject) => {
            const tfApplySpawn = spawn('terraform', ['apply', '-var-file=terraform.tfvars', '-auto-approve'], {
                cwd: targetPath,
            });

            tfApplySpawn.stdout.on('data', (data) => {
                const dataAsString = data.toString();
                console.log(dataAsString);
                stdoutHandler(dataAsString);
            });

            tfApplySpawn.stderr.on('data', (data) => {
                console.log(data.toString());
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
    destroy({ targetPath }) {
        return new Promise((resolve, reject) => {
            const tfDestroySpawn = spawn('terraform', ['destroy', '-var-file=terraform.tfvars', '-auto-approve'], {
                cwd: targetPath,
            });

            tfDestroySpawn.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            tfDestroySpawn.stderr.on('data', (data) => {
                console.log(data.toString());
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