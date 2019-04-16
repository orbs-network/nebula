const path = require("path");

function resolvePath(localPath, dirname) {
    if (path.isAbsolute(localPath)) {
        return localPath;
    }

    if (localPath[0] === '~') {
        return path.join(process.env.HOME, localPath.slice(1));
    }

    return path.resolve(process.cwd(), dirname, localPath);
}

module.exports = {
    resolvePath,
};
