const path = require('path');
const { trim, isError, isEmpty, isInteger, map, first, isString } = require('lodash');
const { exec } = require('../utils/exec');
const fs = require('fs');
const util = require('util');
const { spawn } = require('child_process');
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const { flatMap } = require('lodash');

const ora = require('ora');
const outputs = {};
const terraformResourcesBasePath = path.join(__dirname, '../../resources/terraform');

class Terraform {
    constructor() {
        this.outputs = outputs;
    }

    setCachePath(cachePath) {
        this.cachePath = cachePath;
    }

    setTargetPath(name) {
        this.targetPath = path.join(this.cachePath, name);
    }

    async copyTerraformInfraTemplate({ cloud }) {
        const sourcePath = path.join(terraformResourcesBasePath, cloud.type);

        const copyResult = await exec(`cp -R ${sourcePath}/* ${this.targetPath} && rm -f ${path.join(this.targetPath, 'eip.tf')} && rm -f ${path.join(this.targetPath, 'ethereum-ebs*')}`, { cwd: sourcePath });
        if (isError(copyResult)) {
            throw copyResult;
        }

        if (copyResult.exitCode !== 0) {
            throw new Error(`Copy Terraform infra base has failed! Process said: ${copyResult.stderr}`);
        }

        if (cloud.ip) {
            const copyEipResult = await exec(`cp ${sourcePath}/eip.tf ${this.targetPath} && touch ${path.join(this.targetPath, '.eip')}`, { cwd: sourcePath });
            if (isError(copyEipResult)) {
                throw copyEipResult;
            }

            if (copyEipResult.exitCode !== 0) {
                throw new Error(`Copy Terraform Elastic IP template has failed! Process said: ${copyEipResult.stderr}`);
            }
        }

        if (!cloud.backend) {
            await exec(`rm -f ${path.join(this.targetPath, 'backend.tf')}`);
        } else {
            await this.updateBackendFile({ name: `orbs-${cloud.region}-${cloud.name}`, region: cloud.region, pathToBackendFile: path.join(this.targetPath, 'backend.tf') });
        }
    }

    async updateBackendFile({ region, pathToBackendFile, name }) {
        let backendContent = await readFile(pathToBackendFile, 'utf-8');
        backendContent = backendContent.replace('__region__', region);
        backendContent = backendContent.replace('__name__', name);
        return writeFile(pathToBackendFile, backendContent);
    }

    createTerraformVariablesFile({ cloud, keys }) {
        const rows = [];
        const { name } = cloud;

        // SSH key specific variables
        rows.push({ path_to_ssh_pubkey: keys.ssh.path });

        if (!isEmpty(keys.ssh.cidr)) {
            rows.push({ incoming_ssh_cidr_blocks: keys.ssh.cidr });
        }

        rows.push(
            { name: cloud.name },
            { aws_profile: keys.aws.profile },
            { region: cloud.region },
            { instance_type: cloud.instanceType },
            { instance_count: isInteger(cloud.nodeCount) ? cloud.nodeCount : 2 }
        );

        const boyarKey = 'boyar/config.json';
        const boyarBucket = `boyar-${name}`;
        const s3Endpoint = cloud.region == 'us-east-1' ? "s3" : `s3-${cloud.region}`;
        const boyarConfigUrl = !isEmpty(cloud.bootstrapUrl) ? cloud.bootstrapUrl : `https://${s3Endpoint}.amazonaws.com/${boyarBucket}/${boyarKey}`;

        rows.push(
            { boyar_config_source: `<<EOF\n${JSON.stringify(keys.orbs.boyarConfig)}\nEOF`, multiline: true },
            { s3_bucket_name: boyarBucket },
            { s3_boyar_key: boyarKey },
            { s3_boyar_config_url: boyarConfigUrl }
        );

        if (!isEmpty(keys.orbs.ethereumEndpoint)) {
            rows.push({ ethereum_endpoint: keys.orbs.ethereumEndpoint });
        }

        if (!isEmpty(keys.orbs.ethereumTopologyContractAddress)) {
            rows.push({ ethereum_topology_contract_address: keys.orbs.ethereumTopologyContractAddress });
        }

        return map(rows, (row) => {
            const key = first(Object.keys(row));
            const value = row[key];
            const serializedValue = isString(value) && value.substr(0, 5) == "<<EOF" ? value : JSON.stringify(value);
            return `${key} = ${serializedValue}`;
        }).join("\n");
    }

    async writeTerraformVariablesFile({ cloud, keys }) {
        const contentAsString = this.createTerraformVariablesFile({ cloud, keys });
        const target = path.join(this.targetPath, 'terraform.tfvars');

        await writeFile(target, contentAsString);
    }

    async create({ cloud, keys }) {
        const eip = 'ip' in cloud;
        const { name } = cloud;
        this.setTargetPath(name);

        const varsObject = {
            node_key_pair: base64JSON(serializeKeys(keys.orbs.nodeKeys)),
        };

        if (!isEmpty(keys.ssl) && !isEmpty(keys.ssl.sslCertificatePath)) {
            varsObject.ssl_certificate = fs.readFileSync(keys.ssl.sslCertificatePath).toString("base64");
        }

        if (!isEmpty(keys.ssl) && !isEmpty(keys.ssl.sslPrivateKeyPath)) {
            varsObject.ssl_private_key = fs.readFileSync(keys.ssl.sslPrivateKeyPath).toString("base64");
        }

        this.spinner = ora('Performing initial checks').start();

        try {
            await this.createTerraformFolder();
            this.spinner.succeed();
            this.spinner.start(`Generating Terraform code at ${this.targetPath}`);
            await this.writeTerraformVariablesFile({ cloud, keys });
            await this.copyTerraformInfraTemplate({ cloud });
            this.spinner.succeed();
            this.spinner.start(`Terraform initialize`);
            await this.init({ cloud });
            this.spinner.succeed();

            if (eip) {
                this.spinner.start(`Importing IP ${cloud.ip}`);
                // If we need to bind the manager to an existing Elastic IP then let's import
                // it into our terraform execution context directory.
                await this.importExistingIp({ cloud });
                this.spinner.succeed();
            }

            this.spinner.start(`Creating constellation ${name} on AWS`);
            const { outputs } = await this.apply({ varsObject, cloud });
            this.spinner.succeed();

            if (eip) {
                outputs[outputs.findIndex(o => o.key === 'manager_ip')].value = cloud.ip;
            }

            return {
                ok: true,
                tfPath: this.targetPath,
                outputs,
                name
            };
        } catch (err) {
            this.spinner.fail();

            return {
                ok: false,
                tfPath: this.targetPath,
                message: 'Nebula failed to deploy your infrastucture',
                error: err
            };
        }
    }

    async destroy({ name }) {
        this.spinner = ora('Perform initial checks').start();

        try {
            this.setTargetPath(name);
            this.spinner.succeed();

            if (fs.existsSync(path.join(this.targetPath, '.eip'))) {
                this.spinner.start('Detaching Elastic IP from Terraform context');
                // Looks like an Elastic IP was imported to this Terraform build
                // Let's detach it from Terraform so that we don't destroy it.
                await this.detachElasticIP();
                this.spinner.succeed();
            }

            this.spinner.start(`Destroying constellation ${name} resources in AWS`);
            await this.terraformDestroy({ name });
            this.spinner.succeed();

            return {
                ok: true,
                tfPath: this.targetPath,
            };
        } catch (err) {
            this.spinner.fail();

            return {
                ok: false,
                tfPath: this.targetPath,
                message: 'Could not destroy your infrastucture on AWS',
                error: err,
            };
        }
    }

    terraformDestroy({ name }) {
        const _this = this;
        return new Promise((resolve, reject) => {
            const tfDestroySpawn = spawn('terraform', ['destroy', '-var-file=terraform.tfvars', '-auto-approve', '-refresh'], {
                cwd: this.targetPath,
            });

            tfDestroySpawn.stdout.on('data', (data) => {
                log(data.toString(), name, 'tf-destroy');
            });

            tfDestroySpawn.stderr.on('data', (data) => {
                log(data.toString(), name, 'tf-destroy', 'err');
            });

            tfDestroySpawn.on('close', (code) => {
                if (code === 0) {
                    resolve({ code });
                    return;
                }

                _this.spinner.fail();
                console.log('');
                console.log('');
                console.log(_this.outputs[name].ops['tf-destroy'].err.join('\n'));

                reject(new Error('Could not perform Terraform destroy phase!'));
            });
        });
    }

    async detachElasticIP() {
        const detachResult = await exec('terraform state rm aws_eip.eip_manager', {
            cwd: this.targetPath,
        });

        if (detachResult.exitCode !== 0) {
            this.spinner.fail();
            console.log('');
            console.log('');
            console.log(detachResult.stderr);

            throw detachResult;
        }
    }

    async createTerraformFolder() {
        const { exitCode } = await exec(`mkdir -p ${this.targetPath}`);

        if (exitCode !== 0) {
            throw new Error("Couldn't create execution context directory for Terraform!");
        }

        await new Promise((r) => { setTimeout(r, 1000); });
    }

    init({ cloud }) {
        const { name } = cloud;
        const _this = this;

        return new Promise((resolve, reject) => {
            const tfInitSpawn = spawn('terraform', ['init'], {
                cwd: this.targetPath,
            });

            tfInitSpawn.stdout.on('data', (data) => {
                log(data.toString(), name, 'init');
            });

            tfInitSpawn.stderr.on('data', (data) => {
                log(data.toString(), name, 'init', 'err');
            });

            tfInitSpawn.on('close', (code) => {
                if (code === 0) {
                    resolve({ code });
                    return;
                }
                _this.spinner.fail();
                console.log('');
                console.log('');
                console.log(_this.outputs[name].ops['init'].err.join('\n'));
                reject({ code });
            });
        })
    }

    importExistingIp({ cloud }) {
        const { ip, name } = cloud;
        const _this = this;

        return new Promise((resolve, reject) => {
            const tfImportSpawn = spawn('terraform', ['import', 'aws_eip.eip_manager', ip], {
                cwd: this.targetPath,
            });

            tfImportSpawn.stdout.on('data', (data) => {
                log(data.toString(), name, 'import-ip');
            });

            tfImportSpawn.stderr.on('data', (data) => {
                log(data.toString(), name, 'import-ip', 'err');
            });

            tfImportSpawn.on('close', (code) => {
                if (code === 0) {
                    resolve({ code });
                    return;
                }

                _this.spinner.fail();
                console.log('');
                console.log('');
                console.log(_this.outputs[name].ops['import-ip'].err.join('\n'));

                reject(new Error('Could not perform Terraform import of existing Elastic IP phase!'));
            });
        });
    }

    parseOutputs(str) {
        return str
            .split('\n')
            .map((_item) => {
                if (_item.indexOf(' = ') === -1) {
                    return null;
                }
                /*eslint no-control-regex: 0*/
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

    apply({ varsObject, cloud }) {
        const { name } = cloud;
        const _this = this;

        let outputs = [];
        let outputsStarted = false;
        const stdoutHandler = (dataAsString) => {
            // Search for the public IP of the cluster manager node.
            if (dataAsString.indexOf('Outputs:') !== -1) {
                outputsStarted = true;
            }

            if (outputsStarted && dataAsString.indexOf(' = ') !== -1) {
                outputs = outputs.concat(this.parseOutputs(dataAsString));
            }
        };

        return new Promise((resolve, reject) => {
            const vars = flatMap(varsObject, (value, key) => {
                return ['-var', `${key}=${value}`];
            });

            const tfApplySpawn = spawn('terraform', ['apply', '-var-file=terraform.tfvars', '-auto-approve', ...vars], {
                cwd: this.targetPath,
            });

            tfApplySpawn.stdout.on('data', (data) => {
                const dataAsString = data.toString();
                // I don't write just apply since it's a reserved js method
                log(data.toString(), name, 'tf-apply');
                stdoutHandler(dataAsString);
            });

            tfApplySpawn.stderr.on('data', (data) => {
                log(data.toString(), name, 'tf-apply', 'err');
            });

            tfApplySpawn.on('close', (code) => {
                if (code === 0) {
                    resolve({ code, outputs });
                    return;
                }

                _this.spinner.fail();
                console.log('');
                console.log('');
                console.log(_this.outputs[name].ops['tf-apply'].err.join('\n'));

                reject(new Error('Could not perform Terraform apply phase!'));
            });
        });
    }
}

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
}

function base64JSON(source) {
    return Buffer.from(JSON.stringify(source)).toString("base64");
}

function serializeKeys(keys) {
    return {
        ['node-address']: keys.address,
        ['node-private-key']: keys.privateKey,
    };
}

module.exports = {
    Terraform,
};
