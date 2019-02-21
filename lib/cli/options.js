const { createOptions } = require('./options/create');
const { destroyOptions } = require('./options/destroy');
const { updateOptions } = require('./options/update');
const { networkStatusOptions } = require('./options/network-status');

module.exports = {
    createOptions,
    destroyOptions,
    updateOptions,
    networkStatusOptions,
};
