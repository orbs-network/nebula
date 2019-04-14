const path = require('path');

const { logRed, logGreen, getComposeFileOrFlagsHandler } = require('./../methods');
const { Nebula } = require('./../../../lib/services/nebula');

async function destroy({ name, cachePath: _catchPath, fileMode, __fileDirname }) {
    let cachePath = _catchPath;

    const nebula = new Nebula();

    if (cachePath !== undefined) {
        if (fileMode) {
            cachePath = path.join(__fileDirname, cachePath);
        } else if (cachePath.substr(0, 1) !== '/' && cachePath.substr(0, 1) !== '~') {
            cachePath = path.join(process.cwd(), cachePath);
        }
        nebula.setTerraformCachePath(cachePath);
    }

    const destroyResult = await nebula.destroyConstellation({ name });

    if (destroyResult.ok === true) {
        logGreen('Your constellation has been successfully destroyed!');
        return destroyResult;
    } else {
        logRed('Could not destroy constellation!');
        logRed(destroyResult.error);
        console.log('');
        logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
        logRed('please kindly open a GitHub issue here:');
        logRed('https://github.com/orbs-network/nebula');
        return Promise.reject(destroyResult);
    }
}

module.exports = {
    destroy: getComposeFileOrFlagsHandler(destroy)
};