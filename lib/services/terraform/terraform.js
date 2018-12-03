const uuid = require('uuid/v1');
const { exec } = require('child-process-promise');
const path = require('path');
const util = require('util');
const { spawn } = require('child_process');
const { trim } = require('lodash');

const fs = require('fs');
const writeFile = util.promisify(fs.writeFile);

const types = require('./../../../constants/types');
const tmpBasePath = path.join(__dirname, '../../../_terraform');
const amisJSON = require('./clouds/aws/amis');

const resourcesBasePath = path.join(__dirname, '../../../resources');
const terraformResourcesBasePath = path.join(resourcesBasePath, '/terraform');

class TerraformService {
    constructor(binaryAdapter) {
        this.binaryAdapter = binaryAdapter;
    }

    async createSpinContextDirectory(contextId) {
        const target = path.join(tmpBasePath, contextId);
        const result = await exec(`mkdir -p ${target}`);
        const { childProcess: {
            exitCode,
        } } = result;

        if (exitCode !== 0) {
            throw new Error("Couldn't create execution context directory for Terraform!");
        }

        return true;
    }

    contextDirPath(spinContext) {
        return path.join(tmpBasePath, spinContext);
    }

    getListOfAvailableRegions() {
        // TODO: Implement
        return '';
    }

    getAMIByRegion(region) {
        const item = amisJSON.amis.find(a => a.region === region);
        if (item === undefined) {
            // TODO: list the available exact regions we are providing from our amis.json file.
            throw new Error(`The provided region (${region}) does not exist or is mispelled!
            Available regions: ${this.getListOfAvailableRegions()}`);
        }

        return item.id;
    }

    async writeTerraformVariablesFile({ spinContext, cloud, keys }) {
        let contentAsString = '';

        // SSH key specific variables
        contentAsString += `path_to_ssh_pubkey = "${keys.ssh.path}"\n`;

        // Orbs federation member keyPair
        contentAsString += `orbs_member_public_key = "${keys.orbs.publicKey}"\n`;
        contentAsString += `orbs_member_private_key = "${keys.orbs.privateKey}"\n`;

        if (cloud.type === types.clouds.aws) {
            // AWS Credentials
            contentAsString += `access_key = "${keys.aws.accessKey}"\n`;
            contentAsString += `secret_key = "${keys.aws.secretKey}"\n`;

            // AWS Others
            contentAsString += `region = "${cloud.region}"\n`;

            contentAsString += `aws_ami_id = "${this.getAMIByRegion(cloud.region)}"\n`;
            contentAsString += `aws_orbs_master_instance_type = "${cloud.instanceType}"\n`;
            contentAsString += `aws_orbs_slave_instance_type = "${cloud.instanceType}"\n`;

            contentAsString += `aws_ether_instance_type = "t2.micro"\n`; // Granular control over instance type for Ethereum node
        }

        const target = path.join(this.contextDirPath(spinContext), "terraform.tfvars");

        await writeFile(target, contentAsString);
    }

    async copyTerraformInfraTemplate({ cloud, spinContext }) {
        const sourcePath = path.join(terraformResourcesBasePath, cloud.type);
        const targetPath = this.contextDirPath(spinContext);
        await exec(`cp \`ls -A ${sourcePath} | grep -v "eip.tf"\` ${sourcePath}/* ${targetPath}`, { cwd: sourcePath });

        if (cloud.ip) {
            await exec(`cp ${sourcePath}/eip.tf ${targetPath} && touch ${path.join(targetPath, '.eip')}`);
        }
    }

    copyStackScripts({ spinContext }) {
        const sourcePath = path.join(resourcesBasePath, 'swarm/docker-compose.yml');
        const targetPath = this.contextDirPath(spinContext);
        return exec(`cp ${sourcePath} ${targetPath}`);
    }

    init({ spinContext }) {
        const targetPath = this.contextDirPath(spinContext);

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
    }

    importExistingIp({ spinContext, cloud }) {
        const targetPath = this.contextDirPath(spinContext);

        return new Promise((resolve, reject) => {
            const tfImportSpawn = spawn('terraform', ['import', 'aws_eip.eip_master', cloud.ip], {
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
    }

    plan({ spinContext }) {
        const targetPath = this.contextDirPath(spinContext);

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
    }

    parseOutputs(str) {
        return str
            .split('\n')
            .map((_item) => {
                if (_item.indexOf(' = ') === -1) {
                    return null;
                }

                const item = _item.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

                const outputParts = item.split(' = ');
                const key = trim(outputParts[0]);
                const value = trim(outputParts[1]);

                return {
                    key,
                    value
                };
            })
            .filter(output => output !== null);
    }

    apply({ spinContext }) {
        const targetPath = this.contextDirPath(spinContext);

        return new Promise((resolve, reject) => {
            let outputs = [];
            let outputsStarted = false;

            const tfApplySpawn = spawn('terraform', ['apply', '-var-file=terraform.tfvars', '-auto-approve'], {
                cwd: targetPath,
            });

            tfApplySpawn.stdout.on('data', (data) => {
                // Search for the public IP of the cluster manager node.
                const dataAsString = data.toString();

                if (dataAsString.indexOf('Outputs:') !== -1) {
                    outputsStarted = true;
                }

                if (outputsStarted && dataAsString.indexOf(' = ') !== -1) {
                    outputs = outputs.concat(this.parseOutputs(dataAsString));
                }

                console.log(dataAsString);
            });

            tfApplySpawn.stderr.on('data', (data) => {
                console.log(data.toString());
            });

            tfApplySpawn.on('close', (code) => {
                if (code === 0) {
                    resolve({ code, outputs });
                    return;
                }
                reject({ code });
            });
        })
    }

    async destroy({ spinContext }) {
        const targetPath = this.contextDirPath(spinContext);
        if (fs.existsSync(path.join(targetPath, '.eip'))) {
            console.log('Detaching Elastic IP from Terraform context...');
            // Looks like an Elastic IP was imported to this Terraform build
            // Let's detach it from Terraform so that we don't destroy it.
            const detachResult = await exec('terraform state rm aws_eip.eip_master', {
                cwd: targetPath,
            });
            console.log(detachResult.stdout);
        }

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
    }

    async spinUp({ cloud, keys }) {
        const eip = 'ip' in cloud;
        const spinContext = uuid();

        await this.createSpinContextDirectory(spinContext);
        await this.writeTerraformVariablesFile({ spinContext, cloud, keys });
        await this.copyTerraformInfraTemplate({ cloud, spinContext });
        await this.copyStackScripts({ spinContext });

        // First step is to init terraform
        const initResult = await this.init({ spinContext });
        if (initResult.code !== 0) {
            return {
                ok: false,
                message: 'Terraform init has failed (logs are inline)',
                code: initResult.code,
            };
        }

        if (eip) {
            // If we need to bind the master to an existing Elastic IP then let's import
            // it into our terraform execution context directory.
            await this.importExistingIp({ spinContext, cloud });
        }

        // Second step is to run a terraform plan and make sure all is well with our generated terraform scripts.
        const planResult = await this.plan({ spinContext });
        if (planResult.code !== 0) {
            return {
                ok: false,
                message: 'Terraform plan has failed (logs are inline)',
                code: planResult.code,
            };
        }

        const applyResult = await this.apply({ spinContext });
        if (applyResult.code !== 0) {
            return {
                ok: false,
                message: 'Terraform apply has failed (logs are inline)',
                code: applyResult.code,
            };
        }

        return {
            ok: true,
            outputs: applyResult.outputs,
            spinContext,
        };
    }

    async spinDown({ spinContext }) {
        await this.destroy({ spinContext });

        return {
            ok: true,
        };
    }
}

module.exports = {
    TerraformService,
};