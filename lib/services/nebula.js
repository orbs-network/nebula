/**
 * Main facade for the public Nebula API
 */
const path = require('path');
const uuid = require('uuid/v1');
const { Terraform } = require('./terraform');

class Nebula {
    constructor() {
        this.terraform = new Terraform();
        this.terraform.setCachePath(path.join(process.cwd(), '_terraform'));
    }

    setTerraformCachePath(cachePath) {
        this.terraform.setCachePath(cachePath);
    }

    async createConstellation({ topologyProvider, chains = [], cloud = {}, keys = {}, }) {
        const eip = 'ip' in cloud;

        if (!cloud.name) { // If there is no name , assign an annonymous name to the node
            cloud.name = uuid().substr(0, 30);
        }

        if (cloud.name.length > 55) {
            return {
                ok: false,
                error: 'Constellation name is limited to 55 characters',
                tfPath: false,
            };
        }

        const result = await this.terraform.create({
            topologyProvider,
            chains,
            cloud,
            keys,
        });

        if (!result.ok) {
            console.log('');
            console.log('Could not create infrastructure using Terraform (log inline)');
            console.log(result.error);
            return result;
        }

        const { outputs } = result;

        const swarmmanagerPublicIp = (eip) ? cloud.ip :
            outputs.find(o => o.key === 'manager_ip').value;

        return {
            ok: true,
            tfPath: result.tfPath,
            name: cloud.name,
            manager: {
                ip: swarmmanagerPublicIp,
            },
        };
    }

    async destroyConstellation({ name }) {
        const result = await this.terraform.destroy({ name });

        if (!result.ok) {
            console.log('Could not destroy constellation with the supplied name!', name);
            return result;
        }

        return {
            ok: true,
            error: null,
        };
    }
}

module.exports = {
    Nebula,
};
