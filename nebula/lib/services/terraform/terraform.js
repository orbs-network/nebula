const uuid = require('uuid/v1');
const { exec } = require('child-process-promise');
const path = require('path');
const util = require('util');

const fs = require('fs');
const writeFile = util.promisify(fs.writeFile);

const types = require('./../../../constants/types');
const tmpBasePath = path.join(__dirname, '../../../_terraform');
const amisJSON = require('./clouds/aws/amis');

const terraformResourcesBasePath = path.join(__dirname, "../../../resources/terraform");

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

    }

    getAMIByRegion(region) {
        const item = amisJSON.amis.find(a => a.region === region);
        if (item === undefined) {
            // TODO: list the available exact regions we are providing from our amis.json file.
            throw new Error(`The provided region (${region}) does not exist or is mispelled!`);
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
            contentAsString += `aws_orbs_master_instance_type = "t2.micro"\n`;
            contentAsString += `aws_orbs_slave_instance_type = "t2.micro"\n`;

            contentAsString += `aws_ether_instance_type = "t2.micro"\n`; // Granular control over instance type for Ethereum node
        }

        const target = path.join(this.contextDirPath(spinContext), "terraform.tfvars");

        await writeFile(target, contentAsString);
    }

    async copyTerraformInfraTemplate({ cloud, spinContext }) {
        const sourcePath = path.join(terraformResourcesBasePath, cloud.type);
        const targetPath = this.contextDirPath(spinContext);
        await exec(`cp ${sourcePath}/* ${targetPath}`);
    }

    async spinUp({ cloud, keys }) {
        const spinContext = uuid();
        await this.createSpinContextDirectory(spinContext);
        await this.writeTerraformVariablesFile({ spinContext, cloud, keys });
        await this.copyTerraformInfraTemplate({ cloud, spinContext });

        return {
            ok: false,
            spinContext,
        }
    }
}

module.exports = {
    TerraformService,
};