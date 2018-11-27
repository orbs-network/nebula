/**
 * Orchestrator for all Nebula operations
 */
const { exec } = require('child-process-promise');
const { TerraformService } = require('./../terraform/terraform');
const tf = new TerraformService({});

class CoreService {
    constructor() {
    }

    async createConstellation({ cloud = {}, keys = {}, }) {
        const result = await tf.spinUp({
            cloud,
            keys,
        });

        if (!result.ok) {
            console.log('Could not create infrastructure using Terraform (log inline)');
            return result;
        }

        const { outputs } = result;
        console.log('Terraform execution context:', result.spinContext);
        const swarmMasterPublicIp = outputs.find(o => o.key === 'master.ip');
        const swarmMasterPublicDns = outputs.find(o => o.key === 'master.dns');

        const deployGorbsResult = await exec(`ssh -o StrictHostKeyChecking=no ubuntu@${swarmMasterPublicIp.value} 'sudo docker stack deploy --compose-file /home/ubuntu/docker-compose.yml helloworld'`);

        console.log(deployGorbsResult.stdout);

        return {
            ok: true,
            spinContext: result.spinContext,
            master: {
                ip: swarmMasterPublicIp.value,
                dns: swarmMasterPublicDns.value,
            },
        };
    }

    async destroyConstellation({ spinContext }) {
        const spinDownResult = await tf.spinDown({
            spinContext,
        });

        if (!spinDownResult.ok) {
            console.log('Could not destroy constellation with the supplied contextId!', spinContext);
            return spinDownResult;
        }

        return {
            ok: true
        };
    }
}

module.exports = {
    CoreService,
};