function destroyOptions(yargs) {
    return yargs
        .option('name', {
            describe: 'the name you used or were provided with when you created your constellation',
            default: '',
        })
        .usage('nebula destroy --name [your-constellation-name]')
        .demandOption('name')
        .help('help');
}

module.exports = {
    destroyOptions,
};