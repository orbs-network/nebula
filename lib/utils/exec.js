const { exec: _exec } = require('child-process-promise');
const { isError } = require('lodash');

const verboseDefaultValue = 'NEBULA_VERBOSE' in process.env && process.env['NEBULA_VERBOSE'] === '1' | false;

async function exec(cmd, opts = {}, verbose = verboseDefaultValue) {
    if (verbose) {
        console.log('[exec-call] $ ', cmd, opts);
    }

    const result = await _exec(cmd, opts).catch(err => err);
    if (isError(result)) {
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

module.exports = {
    exec,
};