const { create } = require('./handlers/create');
const { destroy } = require('./handlers/destroy');
const { update } = require('./handlers/update');
const { status } = require('./handlers/network-status');
const { bootstrapConfig } = require('./handlers/bootstrap');

module.exports = {
    create,
    destroy,
    update,
    status,
    bootstrapConfig,
};
