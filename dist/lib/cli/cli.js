"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_1 = require("./handlers/create");
const destroy_1 = require("./handlers/destroy");
const update_1 = require("./handlers/update");
const network_status_1 = require("./handlers/network-status");
const bootstrap_1 = require("./handlers/bootstrap");
exports.default = {
    create: create_1.create,
    destroy: destroy_1.destroy,
    update: update_1.update,
    status: network_status_1.status,
    bootstrapConfig: bootstrap_1.bootstrapConfig,
};
//# sourceMappingURL=cli.js.map