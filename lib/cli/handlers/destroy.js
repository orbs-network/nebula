const path = require('path');

const { logRed, logGreen, getComposeFileOrFlagsHandler } = require('./../methods');
const { CoreService } = require('./../../../lib/services/core/core');
const { TerraformService } = require('./../../../lib/services/terraform/terraform');
const terraformProdAdapter = require('./../../../lib/adapters/terraform/adapter');
const { coreAdapter } = require('../../../lib/adapters/core/adapter');

async function destroy({ name, cachePath: _catchPath, fileMode, __fileDirname }) {
    let cachePath = _catchPath;

    if (cachePath !== undefined) {
        if (fileMode) {
            cachePath = path.join(__fileDirname, cachePath);
        } else if (cachePath.substr(0, 1) !== '/' && cachePath.substr(0, 1) !== '~') {
            cachePath = path.join(process.cwd(), cachePath);
        }
    }

    const c = new CoreService(new TerraformService(terraformProdAdapter, cachePath), coreAdapter);

    const destroyResult = await c.destroyConstellation({ spinContext: name });

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