"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const methods_1 = require("../methods");
const nebula_1 = require("../../../lib/services/nebula");
const resolve_path_1 = require("../../utils/resolve-path");
async function destroy({ name, cachePath: _catchPath, fileMode, __fileDirname }) {
    let cachePath = _catchPath;
    if (cachePath !== undefined) {
        cachePath = resolve_path_1.resolvePath(cachePath, fileMode ? __fileDirname : process.cwd());
    }
    else {
        cachePath = resolve_path_1.resolvePath("~/.nebula");
    }
    const nebula = new nebula_1.Nebula();
    nebula.setTerraformCachePath(cachePath);
    const destroyResult = await nebula.destroyConstellation({ name });
    if (destroyResult.ok === true) {
        methods_1.logGreen('Your constellation has been successfully destroyed!');
        return destroyResult;
    }
    else {
        methods_1.logRed('Could not destroy constellation!');
        methods_1.logRed(destroyResult.error);
        console.log('');
        methods_1.logRed('If you are clueless as to why this error happened or think it\'s a bug with Nebula');
        methods_1.logRed('please kindly open a GitHub issue here:');
        methods_1.logRed('https://github.com/orbs-network/nebula');
        return Promise.reject(destroyResult);
    }
}
exports.default = {
    destroy: methods_1.getComposeFileOrFlagsHandler(destroy)
};
//# sourceMappingURL=destroy.js.map