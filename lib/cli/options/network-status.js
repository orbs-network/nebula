function networkStatusOptions(yargs) {
    return yargs        
        .option('config-path')
        .option('vchain');
}

module.exports = {
    networkStatusOptions,
};
