const fetch = require('node-fetch');
const chalk = require('chalk');

async function getMetricsByIpAndVChain(ip, chainId, index) {
    const result = await fetch(`http://${ip}/vchains/${chainId}/metrics`, { timeout: 2000 });
    const metrics = await result.json();

    return {
        ok: true,
        ip,
        index,
        height: metrics['BlockStorage.BlockHeight'].Value
    };
}

(async () => {
    const result = await fetch(process.argv[2]);
    const topology = await result.json();

    const statsResults = await Promise.all(topology.network.map((node, index) => {
        const { ip } = node;
        return getMetricsByIpAndVChain(node.ip, process.argv[3], index)
            .catch(err => {
                return {
                    ok: false,
                    ip,
                    index,
                    err
                };
            });
    }));

    statsResults.map((node, index) => {
        index = index + 1;
        const { ip, ok = false } = node;
        let alive = 'DOWN';
        let height = 'N/A';
        let colouredMessage;

        if (ok) {
            alive = 'UP';
            height = node.height;
        }

        const message = `Node #${index} (${ip}) ${alive} Height: ${height}`;

        if (ok) {
            colouredMessage = chalk.green(message);
        } else {
            colouredMessage = chalk.red(message);
        }

        console.log(colouredMessage);
    });
})();
