"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const lodash_1 = require("lodash");
const exec_1 = require("../utils/exec");
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const child_process_1 = require("child_process");
const writeFile = util_1.default.promisify(fs_1.default.writeFile);
const lodash_2 = require("lodash");
const ora_1 = __importDefault(require("ora"));
const outputs = {};
const terraformResourcesBasePath = path_1.default.join(__dirname, '../../resources/terraform');
class Terraform {
    constructor() {
        this.outputs = outputs;
    }
    setCachePath(cachePath) {
        this.cachePath = cachePath;
    }
    setTargetPath(name) {
        this.targetPath = path_1.default.join(this.cachePath, name);
    }
    async copyTerraformInfraTemplate({ cloud }) {
        const sourcePath = path_1.default.join(terraformResourcesBasePath, cloud.type);
        const copyResult = await exec_1.exec(`cp -R ${sourcePath}/* ${this.targetPath} && rm -f ${path_1.default.join(this.targetPath, 'eip.tf')} && rm -f ${path_1.default.join(this.targetPath, 'ethereum-ebs*')}`, { cwd: sourcePath });
        if (lodash_1.isError(copyResult)) {
            throw copyResult;
        }
        if (copyResult.exitCode !== 0) {
            throw new Error(`Copy Terraform infra base has failed! Process said: ${copyResult.stderr}`);
        }
        if (cloud.ip) {
            const copyEipResult = await exec_1.exec(`cp ${sourcePath}/eip.tf ${this.targetPath} && touch ${path_1.default.join(this.targetPath, '.eip')}`, { cwd: sourcePath });
            if (lodash_1.isError(copyEipResult)) {
                throw copyEipResult;
            }
            if (copyEipResult.exitCode !== 0) {
                throw new Error(`Copy Terraform Elastic IP template has failed! Process said: ${copyEipResult.stderr}`);
            }
        }
    }
    createTerraformVariablesFile({ cloud, keys }) {
        const rows = [];
        const { name } = cloud;
        // SSH key specific variables
        rows.push({ path_to_ssh_pubkey: keys.ssh.path });
        if (!lodash_1.isEmpty(keys.ssh.cidr)) {
            rows.push({ incoming_ssh_cidr_blocks: keys.ssh.cidr });
        }
        rows.push({ name: cloud.name }, { aws_profile: keys.aws.profile }, { region: cloud.region }, { instance_type: cloud.instanceType }, { instance_count: lodash_1.isInteger(cloud.nodeCount) ? cloud.nodeCount : 2 });
        const boyarKey = 'boyar/config.json';
        const boyarBucket = `boyar-${name}`;
        const s3Endpoint = cloud.region == 'us-east-1' ? "s3" : `s3-${cloud.region}`;
        const boyarConfigUrl = !lodash_1.isEmpty(cloud.bootstrapUrl) ? cloud.bootstrapUrl : `https://${s3Endpoint}.amazonaws.com/${boyarBucket}/${boyarKey}`;
        rows.push({ boyar_config_source: `<<EOF\n${JSON.stringify(keys.orbs.boyarConfig)}\nEOF`, multiline: true }, { s3_bucket_name: boyarBucket }, { s3_boyar_key: boyarKey }, { s3_boyar_config_url: boyarConfigUrl });
        if (!lodash_1.isEmpty(keys.orbs.ethereumEndpoint)) {
            rows.push({ ethereum_endpoint: keys.orbs.ethereumEndpoint });
        }
        if (!lodash_1.isEmpty(keys.orbs.ethereumTopologyContractAddress)) {
            rows.push({ ethereum_topology_contract_address: keys.orbs.ethereumTopologyContractAddress });
        }
        return lodash_1.map(rows, (row) => {
            const key = lodash_1.first(Object.keys(row));
            const value = row[key];
            const serializedValue = lodash_1.isString(value) && value.substr(0, 5) == "<<EOF" ? value : JSON.stringify(value);
            return `${key} = ${serializedValue}`;
        }).join("\n");
    }
    async writeTerraformVariablesFile({ cloud, keys }) {
        const contentAsString = this.createTerraformVariablesFile({ cloud, keys });
        const target = path_1.default.join(this.targetPath, 'terraform.tfvars');
        await writeFile(target, contentAsString);
    }
    async create({ cloud, keys }) {
        const eip = 'ip' in cloud;
        const { name } = cloud;
        this.setTargetPath(name);
        const varsObject = {
            node_key_pair: base64JSON(serializeKeys(keys.orbs.nodeKeys)),
        };
        if (!lodash_1.isEmpty(keys.ssl) && !lodash_1.isEmpty(keys.ssl.sslCertificatePath)) {
            varsObject.ssl_certificate = fs_1.default.readFileSync(keys.ssl.sslCertificatePath).toString("base64");
        }
        if (!lodash_1.isEmpty(keys.ssl) && !lodash_1.isEmpty(keys.ssl.sslPrivateKeyPath)) {
            varsObject.ssl_private_key = fs_1.default.readFileSync(keys.ssl.sslPrivateKeyPath).toString("base64");
        }
        this.spinner = ora_1.default('Performing initial checks').start();
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
        }
        catch (err) {
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
        this.spinner = ora_1.default('Perform initial checks').start();
        try {
            this.setTargetPath(name);
            this.spinner.succeed();
            if (fs_1.default.existsSync(path_1.default.join(this.targetPath, '.eip'))) {
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
        }
        catch (err) {
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
            const tfDestroySpawn = child_process_1.spawn('terraform', ['destroy', '-var-file=terraform.tfvars', '-auto-approve', '-refresh'], {
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
        const detachResult = await exec_1.exec('terraform state rm aws_eip.eip_manager', {
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
        const { exitCode } = await exec_1.exec(`mkdir -p ${this.targetPath}`);
        if (exitCode !== 0) {
            throw new Error("Couldn't create execution context directory for Terraform!");
        }
        await new Promise((r) => { setTimeout(r, 1000); });
    }
    init({ cloud }) {
        const { name } = cloud;
        const _this = this;
        return new Promise((resolve, reject) => {
            const tfInitSpawn = child_process_1.spawn('terraform', ['init'], {
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
        });
    }
    importExistingIp({ cloud }) {
        const { ip, name } = cloud;
        const _this = this;
        return new Promise((resolve, reject) => {
            const tfImportSpawn = child_process_1.spawn('terraform', ['import', 'aws_eip.eip_manager', ip], {
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
            const key = lodash_1.trim(outputParts[0]);
            const value = lodash_1.trim(outputParts[1]);
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
            const vars = lodash_2.flatMap(varsObject, (value, key) => {
                return ['-var', `${key}=${value}`];
            });
            const tfApplySpawn = child_process_1.spawn('terraform', ['apply', '-var-file=terraform.tfvars', '-auto-approve', ...vars], {
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
    }
    else {
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
exports.default = {
    Terraform,
};
//# sourceMappingURL=terraform.js.map