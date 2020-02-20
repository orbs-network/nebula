"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const readFile = fs_1.default.readFileSync;
const lodash_1 = require("lodash");
function getComposeFileOrFlagsHandler(handler) {
    let argsAsFile;
    return (argv) => {
        let _argv = {};
        if (argv.file !== undefined && argv.file !== '') {
            try {
                let pathToRequire = resolveHome(argv.file);
                if (pathToRequire.substr(0, 1) !== '/') {
                    pathToRequire = path_1.default.join(process.cwd(), pathToRequire);
                }
                argsAsFile = JSON.parse(readFile(pathToRequire, 'utf8').toString());
                argsAsFile._file = argv.file;
                argsAsFile.fileMode = true;
                argsAsFile.__fileDirname = path_1.default.dirname(pathToRequire);
            }
            catch (err) {
                logRed('Problem opening your arguments file!');
                logRed(err);
                process.exit(1);
            }
            _argv = argsAsFile;
        }
        else {
            _argv = argv;
        }
        if (!lodash_1.isEmpty(argv.orbsPrivateKey)) {
            _argv.orbsPrivateKey = argv.orbsPrivateKey;
        }
        if (!lodash_1.isEmpty(argv.sslCertificatePath)) {
            _argv.sslCertificatePath = argv.sslCertificatePath;
        }
        if (!lodash_1.isEmpty(argv.sslPrivateKeyPath)) {
            _argv.sslPrivateKeyPath = argv.sslPrivateKeyPath;
        }
        return handler(_argv);
    };
}
function resolveHome(filepath) {
    if (filepath[0] === '~') {
        return path_1.default.join(process.env.HOME, filepath.slice(1));
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
    console.log(chalk_1.default.greenBright(text));
}
function logRed(text) {
    console.log(chalk_1.default.redBright(text));
}
exports.default = {
    logRed,
    logGreen,
    ValidateIPaddress,
    resolveHome,
    getComposeFileOrFlagsHandler,
};
//# sourceMappingURL=methods.js.map