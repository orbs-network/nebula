const { trim } = require('lodash');
const { exec: _exec } = require('child-process-promise');
const path = require('path');
const fs = require('fs');
const util = require('util');
const { TerraformService } = require('./../../lib/services/terraform/terraform');

const writeFile = util.promisify(fs.writeFile);

const tf = new TerraformService({});

async function exec(cmd, opts) {
    console.log('[exec-call] $ ', cmd, opts);
    let result;

    try {
        // Contain fails within exec
        result = await _exec(cmd, opts);
    } catch (err) {
        result = {
            stderr: err,
            stdout: '',
            childProcess: {
                exitCode: 9,
            },
        };
    }

    console.log('exit code: ', result.childProcess.exitCode);
    console.log('stdout: ', result.stdout);
    console.log('stderr: ', result.stderr);

    result.exitCode = result.childProcess.exitCode;

    return result;
}

const targetDir = path.join(__dirname, 'eip_tf_state');

module.exports = {
    exec,
    remoteExec({ command, ip }) {
        return exec(`ssh -o StrictHostKeyChecking=no ubuntu@${ip} '${command}'`);
    },
    async eventuallyReady(ip) {
        let pollCount = 0;
        let poll = true;

        let boyarFlag = false;
        let swarmLeaderFlag = false;

        do {
            console.log(`polling the cluster deployed service... [${pollCount}]`);
            console.log('IP: ', ip);

            // We test to see that Boyar is available in this manger node.
            const boyarCheck = await exec(`ssh -o StrictHostKeyChecking=no ubuntu@${ip} 'test -e /usr/bin/boyar'`);
            if (boyarCheck.exitCode === 0) {
                console.log('Boyar check has passed! Boyar exists on the manager node!');
                boyarFlag = true;
            }

            const swarmLeaderCheck = await exec(`ssh -o StrictHostKeyChecking=no ubuntu@${ip} 'sudo docker node ls | grep Leader | wc -l'`);
            if (trim(swarmLeaderCheck.stdout) === '1') {
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
    },
    async createStandAloneIPAndVolume({ accessKey, secretKey, region, ethereumAZ }) {
        // Write the variables file into place
        const variableData = `
        access_key = "${accessKey}"
        secret_key = "${secretKey}"
        region     = "${region}"
        ethAZ      = "${ethereumAZ}"
        `;

        await writeFile(path.join(targetDir, 'terraform.tfvars'), variableData);

        await exec(`terraform init`, { cwd: targetDir });

        const eipResult = await exec(`terraform apply -var-file=terraform.tfvars -auto-approve`, {
            cwd: targetDir,
        });

        const outputsCharPosition = eipResult.stdout.indexOf('Outputs:');
        const outputs = tf.parseOutputs(eipResult.stdout.substr(outputsCharPosition));

        const foobarIp = outputs.find(o => o.key === 'foobar.ip');
        const ebsVolume = outputs.find(o => o.key === 'ethereum.id');
        const preExistingElasticIp = foobarIp.value;
        const ethereumEbsVolumeId = ebsVolume.value;

        return {
            preExistingElasticIp,
            ethereumEbsVolumeId
        };
    },
    async checkPlanForStandAloneIPAndVolume() {
        const eipPlanResult = await exec(`terraform plan -var-file=terraform.tfvars`, {
            cwd: targetDir,
        });

        return eipPlanResult.stdout;
    },
    async createEBSFingerprint({ spinContext, outputs }) {
        const ip = outputs.find(o => o.key === 'ethereum.public_ip').value;
        const command = `echo "${spinContext}" > /ethereum-persistency/.fingerprint`;
        const addFingerprintResult = await this.remoteExec({ command, ip });

        if (addFingerprintResult.exitCode !== 0) {
            return {
                ok: false,
                error: addFingerprintResult.stderr,
            };
        }

        return {
            ok: true,
            error: null,
            result: addFingerprintResult,
        };
    },
    async checkEBSFingerprint({ outputs }) {
        const ip = outputs.find(o => o.key === 'ethereum.public_ip').value;
        const command = `cat /ethereum-persistency/.fingerprint`;
        const checkFingerprintResult = await this.remoteExec({ command, ip });

        if (checkFingerprintResult.exitCode !== 0) {
            return {
                ok: false,
                fingerprint: null,
                error: checkFingerprintResult.stderr,
            };
        }

        return {
            ok: true,
            error: null,
            fingerprint: trim(checkFingerprintResult.stdout),
        };
    },
    async destroyStandAloneInfra() {
        console.log('cleaning up the stand alone infra..');
        await exec(`terraform destroy -var-file=terraform.tfvars -auto-approve`, {
            cwd: targetDir,
        });
    },
};