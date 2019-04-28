const _ = require('lodash');

const { getNodes } = require('../boyar/create-config');
const { getEndpoint, getStatus } = require('../../metrics');
const { logRed, logGreen } = require('../methods');

async function status({ configPath, vchain }) {
    if (!configPath || !vchain) {
        return {
            ok: false
        }
    }

    const ips = _.mapValues(getNodes({ configPath }), (ip) => {
        return getEndpoint(ip, vchain);
    });
    const result = await getStatus(ips, 1000, 15000);

    _.each(result, (data, name) => {
        const color = data.status == "green" ? logGreen : logRed;
        color(`${name} ${data.status} blockHeight=${data.blockHeight} version=${data.version}@${_.truncate(data.commit, { length: 8, omission: '' })}`);
    });

    return {
        ok: true,
        result,
    }
}

module.exports = {
    status,
    getNodes,
};
