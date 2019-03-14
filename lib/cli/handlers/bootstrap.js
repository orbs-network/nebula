const { createBoyarConfig } = require('./../boyar/create-config');

function bootstrapConfig({ configPath: _configPath }) {
    let configPath = _configPath;

    if (!configPath) {
        return {
            ok: false
        }
    }

    const boyarConfig = createBoyarConfig({ configPath });
    console.log(JSON.stringify(boyarConfig, 2, 2));

    return {
        ok: true,
        result: boyarConfig,
    };
}

module.exports = {
    bootstrapConfig
}