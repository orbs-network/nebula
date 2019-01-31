const { exec } = require('../../utils/exec');
const { trim } = require('lodash');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const path = require('path');

const coreAdapter = {
    remoteExec({ command, ip }) {
        return exec(`ssh -o StrictHostKeyChecking=no ubuntu@${ip} '${command}'`);
    },

    async getSwarmLeadersCountInCluster({ ip }) {
        const command = 'sudo docker node ls | grep Leader | wc -l';
        const result = await this.remoteExec({
            command,
            ip,
        });

        return parseInt(trim(result.stdout));
    },

    getOutputsFromStorage({ targetPath }) {
        const outputsFilePath = path.join(targetPath, 'outputs.json');
        return readFile(outputsFilePath);
    },

    async boyarIsReady({ ip }) {
        const command = 'test -e /usr/bin/boyar';
        const result = await this.remoteExec({
            command,
            ip,
        });

        if (result.exitCode === 0) {
            return true;
        }
        return false;
    },
};

module.exports = {
    coreAdapter
};