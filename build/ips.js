const outputs = require(process.argv[2]);

outputs
    .filter(o => o.key.indexOf('ip') !== -1)
    .map(o => {
        console.log(o.value);
    });

process.exit(0);