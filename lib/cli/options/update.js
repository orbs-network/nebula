function updateOptions(yargs) {
    return yargs
        .option('file', {
            describe: 'a JSON file representing all flags here for the terminal sake!',
            alias: 'f',
            default: false
        })
        .option('name', {
            describe: 'name of your constellation',
            default: false
        })
        .option('region')
        .option('config-path')
        .option('chain-version');
}

module.exports = {
    updateOptions,
};