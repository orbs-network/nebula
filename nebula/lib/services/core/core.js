/**
 * Orchestrator for all Nebula operations
 */

class CoreService {
    constructor(keyStore) {
        this.keyStore = keyStore;
    }

    async createConstellation({ cloud = {}, keys = {}, }) {

        return Promise.resolve({
            ok: false,
        })
    }

    async spinUp({ cloud }) {}

    async provision(){}

    async spinDown({ cloud }) {}
}

module.exports = {
    CoreService,
};