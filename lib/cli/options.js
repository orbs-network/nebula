const { createOptions } = require('./options/create');
const { destroyOptions } = require('./options/destroy');
const { updateOptions } = require('./options/update');
const { networkStatusOptions } = require('./options/network-status');
const { generateConfigOptions } = require('./options/generate-config');

module.exports = {
    createOptions,
    destroyOptions,
    updateOptions,
    networkStatusOptions,
    generateConfigOptions,
};
