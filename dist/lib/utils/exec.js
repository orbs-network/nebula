"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_promise_1 = require("child-process-promise");
const lodash_1 = require("lodash");
const verboseDefaultValue = 'NEBULA_VERBOSE' in process.env && process.env['NEBULA_VERBOSE'] === '1' | false;
async function exec(cmd, opts = {}, verbose = verboseDefaultValue) {
    if (verbose) {
        console.log('[exec-call] $ ', cmd, opts);
    }
    const result = await child_process_promise_1.exec(cmd, opts).catch(err => err);
    if (lodash_1.isError(result)) {
        return result;
    }
    const { childProcess: { exitCode }, stdout, stderr } = result;
    if (verbose) {
        console.log('exit code: ', exitCode);
        console.log('stdout: ', stdout);
        console.log('stderr: ', stderr);
    }
    return { result, exitCode, stderr, stdout };
}
exports.default = {
    exec,
};
//# sourceMappingURL=exec.js.map