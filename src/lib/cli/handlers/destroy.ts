import { logRed, logGreen, getComposeFileOrFlagsHandler } from "../methods";
import { Nebula } from "../../../lib/services/nebula";
import { resolvePath } from "../../utils/resolve-path";

async function destroy({
  name,
  cachePath: _catchPath,
  fileMode,
  __fileDirname
}) {
  let cachePath = _catchPath;

  if (cachePath !== undefined) {
    cachePath = resolvePath(
      cachePath,
      fileMode ? __fileDirname : process.cwd()
    );
  } else {
    cachePath = resolvePath("~/.nebula");
  }

  const nebula = new Nebula();
  nebula.setTerraformCachePath(cachePath);

  const destroyResult = await nebula.destroyConstellation({ name });

  if (destroyResult.ok === true) {
    logGreen("Your constellation has been successfully destroyed!");
    return destroyResult;
  } else {
    logRed("Could not destroy constellation!");
    logRed(destroyResult.error);
    console.log("");
    logRed(
      "If you are clueless as to why this error happened or think it's a bug with Nebula"
    );
    logRed("please kindly open a GitHub issue here:");
    logRed("https://github.com/orbs-network/nebula");
    return Promise.reject(destroyResult);
  }
}

export default {
  destroy: getComposeFileOrFlagsHandler(destroy)
};
