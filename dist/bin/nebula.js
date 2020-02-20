#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = require("../lib/cli");
const options_1 = require("../lib/cli/options");
require("yargs") // eslint-disable-line
    .command("create", "Create an Orbs constellation in the cloud", options_1.createOptions, cli_1.create)
    .command("destroy", "Destroys an Orbs constellation", options_1.destroyOptions, cli_1.destroy)
    .option("verbose", {
    alias: "v",
    default: false
})
    .command("update", "Updates a running constellation's topology and vChains version", options_1.updateOptions, cli_1.update)
    .command("network-status", "Shows status of the whole network", options_1.networkStatusOptions, cli_1.status)
    .command("bootstrap-config", "Generates bootstrap config", options_1.generateConfigOptions, cli_1.bootstrapConfig)
    .demandCommand()
    .help().argv;
//# sourceMappingURL=nebula.js.map