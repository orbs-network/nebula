"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function destroyOptions(yargs) {
    return yargs
        .option('file', {
        describe: 'a JSON file representing all flags here for the terminal sake!',
        alias: 'f',
        default: undefined
    })
        .option('name', {
        describe: 'the name you used or were provided with when you created your constellation',
        default: '',
    })
        .usage('nebula destroy --name [your-constellation-name]')
        .demandOption('name')
        .help('help');
}
exports.default = {
    destroyOptions,
};
//# sourceMappingURL=destroy.js.map