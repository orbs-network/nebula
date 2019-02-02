/**
 * Orchestrator for all Nebula operations
 */
const path = require('path');
const { isError } = require('lodash');

const tmpBasePath = path.join(__dirname, '../../../_terraform');

class CoreService {
    constructor(terraformServiceInstance, coreAdapter) {
        this.terraformServiceInstance = terraformServiceInstance;
        this.adapter = coreAdapter;
    }

    async eventuallyReady(ip) {
        let pollCount = 0;
        let poll = true;

        let boyarFlag = false;
        let swarmLeaderFlag = false;

        do {
            console.log(`Polling the cluster for readiness... [${pollCount}]`);
            console.log('manager IP: ', ip);

            // We test to see that Boyar is available in this manger node.
            const boyarIsReady = await this.adapter.boyarIsReady({ ip });
            if (boyarIsReady) {
                console.log('Boyar check has passed! Boyar exists on the manager node!');
                boyarFlag = true;
            }

            const swarmLeadersCount = await this.adapter.getSwarmLeadersCountInCluster({ ip });
            if (swarmLeadersCount > 0) {
                console.log('Swarm check passed! Found 1 leader in the cluster!');
                swarmLeaderFlag = true;
            }

            if (swarmLeaderFlag && boyarFlag) {
                return true;
            } else {
                pollCount++;
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }
        } while (poll && pollCount < 60);

        return false;
    }

    async createConstellation({ cloud = {}, keys = {}, }) {
        const eip = 'ip' in cloud;
        const result = await this.terraformServiceInstance.spinUp({
            cloud,
            keys,
        });

        if (!result.ok) {
            console.log('Could not create infrastructure using Terraform (log inline)');
            return result;
        }

        const { outputs } = result;
        console.log('Terraform execution context:', result.spinContext);

        const swarmmanagerPublicIp = (eip) ? cloud.ip :
            outputs.find(o => o.key === 'manager.ip').value;

        return {
            ok: true,
            tfPath: result.tfPath,
            spinContext: result.spinContext,
            manager: {
                ip: swarmmanagerPublicIp,
            },
        };
    }

    async getConstellationOutputs({ spinContext }) {
        const targetPath = path.join(tmpBasePath, spinContext);
        const outputsStream = await this.adapter.getOutputsFromStorage({ targetPath });

        if (isError(outputsStream)) {
            const errorMessage = 'Could not read outputs from storage!';
            console.error(errorMessage);

            return {
                ok: false,
                error: outputsStream,
            };
        }

        const outputs = JSON.parse(outputsStream.toString());
        return {
            ok: true,
            outputs,
        };
    }

    async setupEthereumNode({ ip, keys: { aws: { secretKey, accessKey } }, }) {
        await this.adapter.setupSwarmRexRayPlugin({ ip, secretKey, accessKey, });
        await this.adapter.setupEthereumVolume({ ip });
        await this.adapter.runEthereumContainer({ ip });
    }

    async destroyConstellation({ spinContext }) {
        const spinDownResult = await this.terraformServiceInstance.spinDown({
            spinContext,
        });

        if (!spinDownResult.ok) {
            console.log('Could not destroy constellation with the supplied contextId!', spinContext);
            return {
                ok: false,
                error: spinDownResult.error,
            };
        }

        return {
            ok: true,
            error: null,
        };
    }
}

module.exports = {
    CoreService,
};
