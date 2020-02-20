"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const create_config_1 = require("../boyar/create-config");
const metrics_1 = require("../../metrics");
const methods_1 = require("../methods");
async function status({ configPath, vchain }) {
    if (!configPath || !vchain) {
        return {
            ok: false
        };
    }
    const ips = lodash_1.default.mapValues(create_config_1.getNodes({ configPath }), (ip) => {
        return metrics_1.getEndpoint(ip, vchain);
    });
    const result = await metrics_1.getStatus(ips, 1000, 15000);
    lodash_1.default.each(result, (data, name) => {
        const color = data.status == "green" ? methods_1.logGreen : methods_1.logRed;
        color(`${name} ${data.status} blockHeight=${data.blockHeight} version=${data.version}@${lodash_1.default.truncate(data.commit, { length: 8, omission: '' })}`);
    });
    return {
        ok: true,
        result,
    };
}
exports.default = {
    status,
    getNodes: create_config_1.getNodes,
};
//# sourceMappingURL=network-status.js.map