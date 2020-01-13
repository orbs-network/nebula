const express = require('express');
const metrics = require('./metrics');

const app = express();

metrics._testkit = {
    argv: process.argv,
    configs: [],
}

for (let n in process.argv) {
    if (process.argv[n].indexOf('.json') !== -1) { // This is a path to some JSON config
        metrics._testkit.configs.push({
            path: process.argv[n],
            contents: require(process.argv[n]),
        });
    }
}

setInterval(() => {
    metrics["BlockStorage.BlockHeight"].Value++;
}, 10 * 1000);

app.get('/vchains/:id/metrics', (_, res) => {
    res.json(metrics);
});

console.log('listening on port 80');
app.listen(80);