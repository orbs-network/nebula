const express = require('express');
const metrics = require('./metrics');

const app = express();

setInterval(() => {
    metrics["BlockStorage.BlockHeight"].Value++;
}, 12 * 1000);

app.get('/vchains/:id/metrics', (_, res) => {
    res.json(metrics);
});

console.log('listening on port 8080');
app.listen(8080);