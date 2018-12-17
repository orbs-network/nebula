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
        const eip = 'ip' in cloud;
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

        const swarmMasterPublicIp = (eip) ? cloud.ip :
            outputs.find(o => o.key === 'master.ip').value;

        // const deployGorbsResult = await exec(`ssh -o StrictHostKeyChecking=no ubuntu@${swarmMasterPublicIp} 'sudo docker stack deploy --compose-file /home/ubuntu/docker-compose.yml helloworld'`);
        // console.log(deployGorbsResult.stdout);

        // docker plugin install rexray/ebs EBS_ACCESSKEY=${var.access_key} EBS_SECRETKEY=${var.secret_key}
        // docker volume create –driver rexray/ebs –opt size=5 –opt volumetype=gp2 –name ebs_vol_geth

        return {
            ok: true,
            spinContext: result.spinContext,
            master: {
                ip: swarmMasterPublicIp,
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
