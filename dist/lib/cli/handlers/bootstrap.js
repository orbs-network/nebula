"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_config_1 = require("../boyar/create-config");
function bootstrapConfig({ configPath: _configPath }) {
    let configPath = _configPath;
    if (!configPath) {
        return {
            ok: false
        };
    }
    const boyarConfig = create_config_1.createBoyarConfig({ configPath });
    console.log(JSON.stringify(boyarConfig, 2, 2));
    return {
        ok: true,
        result: boyarConfig,
    };
}
exports.default = {
    bootstrapConfig
};
//# sourceMappingURL=bootstrap.js.map