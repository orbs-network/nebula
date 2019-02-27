function generateConfigOptions(yargs) {
    return yargs
        .option('config-path')
        .help('help');
}

module.exports = {
    generateConfigOptions,
};
