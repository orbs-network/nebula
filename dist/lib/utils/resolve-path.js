"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
function resolvePath(localPath, dirname) {
    if (path_1.default.isAbsolute(localPath)) {
        return localPath;
    }
    if (localPath[0] === '~') {
        return path_1.default.join(process.env.HOME, localPath.slice(1));
    }
    return path_1.default.resolve(process.cwd(), dirname, localPath);
}
exports.default = {
    resolvePath,
};
//# sourceMappingURL=resolve-path.js.map