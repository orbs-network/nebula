const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const readFile = fs.readFileSync;
const { isEmpty } = require("lodash");

function getComposeFileOrFlagsHandler(handler) {
    return (argv) => {
        let _argv = {};

        if (argv.file !== undefined && argv.file !== '') {
            try {
                let pathToRequire = resolveHome(argv.file);
                if (pathToRequire.substr(0, 1) !== '/') {
                    pathToRequire = path.join(process.cwd(), pathToRequire);
                }

                argsAsFile = JSON.parse(readFile(pathToRequire, 'utf8').toString());
                argsAsFile._file = argv.file;
                argsAsFile.fileMode = true;
                argsAsFile.__fileDirname = path.dirname(pathToRequire);
            } catch (err) {
                logRed('Problem opening your arguments file!');
                logRed(err);
                process.exit(1);
            }

            _argv = argsAsFile;
        } else {
            _argv = argv;
        }

        if (!isEmpty(argv.orbsPrivateKey)) {
            _argv.orbsPrivateKey = argv.orbsPrivateKey;
        }

        if (!isEmpty(argv.sslCertificatePath)) {
            _argv.sslCertificatePath = argv.sslCertificatePath;
        }

        if (!isEmpty(argv.sslPrivateKeyPath)) {
            _argv.sslPrivateKeyPath = argv.sslPrivateKeyPath;
        }

        return handler(_argv);
    }
}

function resolveHome(filepath) {
    if (filepath[0] === '~') {
        return path.join(process.env.HOME, filepath.slice(1));
    }
    return filepath;
}

function ValidateIPaddress(ipaddress) {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
        return true;
    }
    return false;
}

function logGreen(text) {
    console.log(chalk.greenBright(text));
}

function logRed(text) {
    console.log(chalk.redBright(text));
}

module.exports = {
    logRed,
    logGreen,
    ValidateIPaddress,
    resolveHome,
    getComposeFileOrFlagsHandler,
};

