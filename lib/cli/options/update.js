function updateOptions(yargs) {
    return yargs
        .option('name')
        .option('config-path')
        .option('chain-version');
}

module.exports = {
    updateOptions,
};