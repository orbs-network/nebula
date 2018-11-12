class CoreService {
    constructor(keyStore) {
        this.keyStore = keyStore;
    }

    async createConstelltation({ region, instanceSize, timeout }) {
        return Promise.resolve({
            ok: false,
        })
    }
}

module.exports = {
    CoreService,
};