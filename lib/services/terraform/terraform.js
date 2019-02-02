const uuid = require('uuid/v1');
const path = require('path');
const { trim, isError, isBoolean } = require('lodash');

const types = require('./../../../constants/types');
const amisJSON = require('./clouds/aws/amis');

const resourcesBasePath = path.join(__dirname, '../../../resources');
const terraformResourcesBasePath = path.join(resourcesBasePath, '/terraform');
const defaultCachePath = path.join('~/.nebula');

function base64JSON(source) {
    return Buffer.from(JSON.stringify(source)).toString("base64");
}

function serializeKeys(keys) {
    return {
        "node-address": keys.address,
        "node-private-key": keys.privateKey,
        "benchmark-consensus-constant-leader": keys.leader,
    };
}

class TerraformService {
    constructor(adapter, cachePath = defaultCachePath) {
        this.adapter = adapter;
        this.cachePath = cachePath;
    }

    async createSpinContextDirectory(contextId) {
        const { exitCode } = await this.adapter.createSpinContextDirectory(contextId);

        if (exitCode !== 0) {
            throw new Error("Couldn't create execution context directory for Terraform!");
        }

        return true;
    }

    tmpBasePath() {
        if (this.cachePath) {
            if (this.cachePath.substr(0, 1) === '~') {
                return this.resolveHome(this.cachePath);
            }
            return this.cachePath;
        }
        return path.join(__dirname, '../../../_terraform');
    }

    contextDirPath(spinContext) {
        return path.join(this.tmpBasePath(), spinContext);
    }

    getAMIByRegion(region) {
        const item = amisJSON.amis.find(a => a.region === region);
        if (item === undefined) {
            // TODO: list the available exact regions we are providing from our amis.json file.
            throw new Error(`The provided region (${region}) does not exist or is mispelled!
            Available regions: ${amisJSON.amis.join(',')}`);
        }

        return item.id;
    }

    createTerraformVariablesFile({ spinContext, cloud, keys }) {
        const shortenedSpinContext = (spinContext.length > 15) ? spinContext.substr(-6, 6)
            : spinContext;
        let contentAsString = '';

        // SSH key specific variables
        contentAsString += `path_to_ssh_pubkey = "${keys.ssh.path}"\n`;

        // Orbs federation member keyPair
        contentAsString += `orbs_member_public_key = "${keys.orbs.publicKey}"\n`;
        contentAsString += `orbs_member_private_key = "${keys.orbs.privateKey}"\n`;

        // We will stick this piece of identifier into each resource name we create to avoid
        // clashing with other resources on the same cloud region.
        contentAsString += `run_identifier = "${shortenedSpinContext}"\n`;

        if (cloud.type === types.clouds.aws) {
            // AWS Credentials
            contentAsString += `aws_profile = "${keys.aws.profile}"\n`;

            // AWS Others
            contentAsString += `region = "${cloud.region}"\n`;

            contentAsString += `aws_ami_id = "${this.getAMIByRegion(cloud.region)}"\n`;
            contentAsString += `aws_orbs_manager_instance_type = "${cloud.instanceType}"\n`;
            contentAsString += `aws_orbs_worker_instance_type = "${cloud.instanceType}"\n`;
            contentAsString += `aws_orbs_worker_instance_count = "${cloud.nodeCount}"\n`;

            contentAsString += `aws_ether_instance_type = "t2.large"\n`; // Granular control over instance type for Ethereum node
            contentAsString += `aws_ether_az = "${cloud.ethereum.az}"\n`;

            contentAsString += `context_id = "${uuid()}"\n`;
            contentAsString += `node_key_pair = "${base64JSON(serializeKeys(keys.orbs.nodeKeys))}"\n`;

            contentAsString += `boyar_config_source =<<EOF\n${JSON.stringify(keys.orbs.boyarConfig)}\nEOF\n`;

            const boyarKey = "boyar/config.json"

            const boyarBucket = `boyar-${shortenedSpinContext}`;
            const s3Endpoint = cloud.region == "us-east-1" ? "s3" : `s3-${cloud.region}`;
            const boyarConfigUrl = `https://${s3Endpoint}.amazonaws.com/${boyarBucket}/${boyarKey}`;

            contentAsString += `s3_bucket_name="${boyarBucket}"\n`
            contentAsString += `s3_boyar_key="${boyarKey}"\n`
            contentAsString += `s3_boyar_config_url="${boyarConfigUrl}"\n`

            if (isBoolean(keys.orbs.ethereum)) {
                contentAsString += `ethereum_count=${keys.orbs.ethereum ? 1 : 0}\n`
            }
        }

        return contentAsString;
    }

    resolveHome(filepath) {
        if (filepath[0] === '~') {
            return path.join(process.env.HOME, filepath.slice(1));
        }
        return filepath;
    }

    async writeTerraformVariablesFile({ spinContext, cloud, keys }) {
        const contentAsString = this.createTerraformVariablesFile({ spinContext, cloud, keys });
        const target = path.join(this.contextDirPath(spinContext), "terraform.tfvars");

        await this.adapter.writeFile(target, contentAsString);
    }

    async copyTerraformInfraTemplate({ cloud, spinContext }) {
        const sourcePath = path.join(terraformResourcesBasePath, cloud.type);
        const targetPath = this.contextDirPath(spinContext);

        const copyResult = await this.adapter.copyInfraBaseTemplate({ sourcePath, targetPath });
        if (isError(copyResult)) {
            return copyResult;
        }

        if (copyResult.exitCode !== 0) {
            return new Error(`Copy Terraform infra base has failed! Process said: ${copyResult.stderr}`);
        }

        if (cloud.ip) {
            const copyEipResult = await this.adapter.copyInfraEipTemplate({ sourcePath, targetPath });
            if (isError(copyEipResult)) {
                return copyEipResult;
            }

            if (copyEipResult.exitCode !== 0) {
                return new Error(`Copy Terraform Elastic IP template has failed! Process said: ${copyEipResult.stderr}`);
            }
        }

        let copyEthEbsResult;

        // Decide on which EBS file we need for ethereum (either import or spawn a new one)
        if (cloud.ethereum.volumeId) {
            copyEthEbsResult = await this.adapter.copyInfraEbsTemplateForImport({ sourcePath, targetPath });
        } else {
            copyEthEbsResult = await this.adapter.copyInfraEbsTemplate({ sourcePath, targetPath });
        }

        if (isError(copyEthEbsResult)) {
            return copyEthEbsResult;
        }

        return true;
    }

    async copyStackScripts({ spinContext }) {
        const sourcePath = path.join(resourcesBasePath, 'swarm/ethereum-node.yml');
        const targetPath = this.contextDirPath(spinContext);

        const result = await this.adapter.copySwarmStackScripts({ sourcePath, targetPath });
        if (isError(result)) {
            return result;
        }

        if (result.exitCode !== 0) {
            return new Error(`Could not copy stack scripts! Process said: ${copyResult.stderr}`);
        }

        return true;
    }

    async init({ spinContext }) {
        const targetPath = this.contextDirPath(spinContext);
        const { code } = await this.adapter.init({ targetPath }).catch(err => err);
        if (code !== 0) {
            return new Error('Could not perform Terraform init phase!');
        }
        return true;
    }

    async importExistingIp({ spinContext, cloud }) {
        const targetPath = this.contextDirPath(spinContext);

        const { code } = await this.adapter.importExistingIp({ targetPath, cloud }).catch(err => err);
        if (code !== 0) {
            return new Error('Could not perform Terraform import of existing Elastic IP phase!');
        }

        return true;
    }

    async importExistingVolume({ spinContext, cloud }) {
        const targetPath = this.contextDirPath(spinContext);

        const { code } = await this.adapter.importExistingEthereumEBSVolume({ targetPath, cloud }).catch(err => err);
        if (code !== 0) {
            return new Error('Could not perform Terraform import of existing EBS volume phase!');
        }

        return true;
    }

    async plan({ spinContext }) {
        const targetPath = this.contextDirPath(spinContext);

        const result = await this.adapter.plan({ targetPath }).catch(err => err);
        if (result.code !== 0) {
            return new Error('Could not perform Terraform plan phase!');
        }

        return true;
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

    async apply({ spinContext }) {
        const targetPath = this.contextDirPath(spinContext);
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

        const result = await this.adapter.apply({ targetPath, stdoutHandler }).catch(err => err);
        if (result.code !== 0) {
            return new Error('Could not perform Terraform apply phase!');
        }

        return Object.assign({}, result, { outputs });
    }

    async destroy({ spinContext }) {
        const targetPath = this.contextDirPath(spinContext);

        if (this.adapter.checkFileExists(path.join(targetPath, '.eip'))) {
            console.log('Detaching Elastic IP from Terraform context...');
            // Looks like an Elastic IP was imported to this Terraform build
            // Let's detach it from Terraform so that we don't destroy it.
            const detachResult = await this.adapter.detachElasticIPFromTerraformState({ targetPath });
            if (isError(detachResult)) {
                console.error('Could not detach existing Elastic IP from Terraform state!');
                return detachResult;
            }
        }

        const result = await this.adapter.destroy({ targetPath }).catch(err => err);
        if (result.code !== 0) {
            return new Error('Could not perform Terraform destroy phase!');
        }

        return result;
    }

    async spinUp({ cloud, keys }) {
        const eip = 'ip' in cloud;
        if (!cloud.ethereum) {
            cloud.ethereum = {};
        }

        const spinContext = cloud.spinContext || uuid();

        const target = path.join(this.tmpBasePath(), spinContext);

        // TODO: Maybe split this into a different part of the system.
        await this.createSpinContextDirectory({ target });
        await this.writeTerraformVariablesFile({ spinContext, cloud, keys });
        await this.copyTerraformInfraTemplate({ cloud, spinContext });
        await this.copyStackScripts({ spinContext });

        // First step is to init terraform
        const initResult = await this.init({ spinContext });
        if (isError(initResult)) {
            return {
                ok: false,
                tfPath: target,
                message: 'Terraform init has failed (logs are inline)',
                error: initResult,
            };
        }

        if (eip) {
            // If we need to bind the manager to an existing Elastic IP then let's import
            // it into our terraform execution context directory.
            const eipImportResult = await this.importExistingIp({ spinContext, cloud });
            if (isError(eipImportResult)) {
                return {
                    ok: false,
                    tfPath: target,
                    message: 'Terraform importing of an existing Elastic IP has failed (logs are inline)',
                    error: eipImportResult,
                };
            }
        }

        // Second step is to run a terraform plan and make sure all is well with our generated terraform scripts.
        const planResult = await this.plan({ spinContext });
        if (isError(planResult)) {
            return {
                ok: false,
                tfPath: target,
                message: 'Terraform plan has failed (logs are inline)',
                error: planResult,
            };
        }

        const applyResult = await this.apply({ spinContext });
        if (isError(applyResult)) {
            return {
                ok: false,
                tfPath: target,
                message: 'Terraform apply has failed (logs are inline)',
                error: applyResult,
            };
        }

        if (eip) {
            applyResult.outputs[applyResult.outputs.findIndex(o => o.key === 'manager.ip')].value = cloud.ip;
        }

        const resultStoreOutput = await this.adapter.storeOutputsForFutureUse({ outputs: applyResult.outputs, targetPath: target });
        if (isError(resultStoreOutput)) {
            return {
                ok: false,
                tfPath: target,
                message: 'Saving Terraform output to disk failed',
                error: resultStoreOutput,
            };
        }

        return {
            ok: true,
            tfPath: target,
            outputs: applyResult.outputs,
            spinContext,
        };
    }

    async spinDown({ spinContext }) {
        const result = await this.destroy({ spinContext });
        if (isError(result)) {
            return {
                ok: false,
                message: 'Terraform destroy has failed (logs are inline)',
                error: result,
            };
        }

        return {
            ok: true,
            error: null,
        };
    }
}

module.exports = {
    TerraformService,
};
