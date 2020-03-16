module.exports = {
    async create(params) {
        console.log('[terraform mock adapter] creating the constellation', params);

        return {
            ok: true,
            tfPath: '/some/fake/tf/path',
            outputs: [
                {
                    key: 'manager_ip',
                    value: '1.2.3.4'
                },
            ],
            name: params.cloud.name,
        };
    },
    async destroy(params) {
        console.log('[terraform mock adapter] destroying the constellation', params);

        return {
            ok: true,
        };
    }
};