"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_1 = require("./options/create");
const destroy_1 = require("./options/destroy");
const update_1 = require("./options/update");
const network_status_1 = require("./options/network-status");
const generate_config_1 = require("./options/generate-config");
exports.default = {
    createOptions: create_1.createOptions,
    destroyOptions: destroy_1.destroyOptions,
    updateOptions: update_1.updateOptions,
    networkStatusOptions: network_status_1.networkStatusOptions,
    generateConfigOptions: generate_config_1.generateConfigOptions,
};
//# sourceMappingURL=options.js.map