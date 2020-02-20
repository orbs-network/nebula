"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const request_promise_1 = __importDefault(require("request-promise"));
const bluebird_1 = __importDefault(require("bluebird"));
async function getMetrics(endpoint) {
    try {
        const body = await request_promise_1.default(`http://${endpoint}/metrics`, {
            timeout: 2000,
        });
        return JSON.parse(body);
    }
    catch (e) {
        // Suppressed errors
        // console.error(`${e.message}: ${endpoint}`);
        return {};
    }
}
function getGauge(metrics, name) {
    return lodash_1.isObject(metrics[name]) ? metrics[name].Value : 0;
}
function getText(metrics, name) {
    return lodash_1.isObject(metrics[name]) ? metrics[name].Value : "";
}
async function getBlockHeight(endpoint) {
    return getGauge(await getMetrics(endpoint), "BlockStorage.BlockHeight");
}
async function getVersion(endpoint) {
    return getText(await getMetrics(endpoint), "Version.Semantic");
}
async function getCommit(endpoint) {
    return getText(await getMetrics(endpoint), "Version.Commit");
}
async function getEthereumStats(endpoint) {
    const metrics = await getMetrics(endpoint);
    return {
        lastBlock: getGauge(metrics, "Ethereum.Node.LastBlock"),
        syncStatus: getText(metrics, "Ethereum.Node.Sync.Status"),
        txReceiptsStatus: getText(metrics, "Ethereum.Node.TransactionReceipts.Status"),
    };
}
async function waitUntil(targetValueOrTestFunc, pollingFunc, pollingInterval, timeout) {
    if (!lodash_1.isInteger(pollingInterval)) {
        pollingInterval = 100;
    }
    if (!lodash_1.isInteger(timeout)) {
        timeout = Infinity;
    }
    return new bluebird_1.default((resolve, reject) => {
        const start = new Date().getTime();
        const wrappedPoll = async () => {
            try {
                const value = await pollingFunc();
                let test = (value) => {
                    return value >= targetValueOrTestFunc;
                };
                if (lodash_1.isFunction(targetValueOrTestFunc)) {
                    test = targetValueOrTestFunc;
                }
                if (test(value)) {
                    clearInterval(interval);
                    resolve(Date.now() - start);
                }
            }
            catch (e) {
                clearInterval(interval);
                reject(e);
            }
        };
        wrappedPoll();
        const interval = setInterval(async () => {
            if ((new Date().getTime() - start) > timeout) {
                clearInterval(interval);
                reject("Timed out");
            }
            wrappedPoll();
        }, pollingInterval);
    });
}
async function waitUntilSync(endpoint, targetBlockHeight, pollingInterval, timeout) {
    const _5_seconds = 5000;
    const _15_minutes = 60 * 15 * 1000;
    console.log(`Waiting for ${endpoint} to sync...`);
    return waitUntil(targetBlockHeight, async () => {
        const result = await getBlockHeight(endpoint);
        console.log('polling.. got:', result);
        return result;
    }, pollingInterval || _5_seconds, timeout || _15_minutes);
}
async function waitUntilVersion(endpoint, targetVersion) {
    const _5_seconds = 5000;
    const _15_minutes = 60 * 15 * 1000;
    console.log(`Waiting for ${endpoint} to update version...`);
    return waitUntil((commit) => {
        return lodash_1.startsWith(commit, targetVersion);
    }, async () => {
        return getVersion(endpoint);
    }, _5_seconds, _15_minutes);
}
async function waitUntilCommit(endpoint, targetCommit) {
    const _5_seconds = 5000;
    const _15_minutes = 60 * 15 * 1000;
    console.log(`Waiting for ${endpoint} to update commit...`);
    return waitUntil((commit) => {
        return lodash_1.startsWith(commit, targetCommit);
    }, async () => {
        return getCommit(endpoint);
    }, _5_seconds, _15_minutes);
}
async function determineStatus(endpoint, pollingInterval, timeout) {
    const startingBlockHeight = await getBlockHeight(endpoint);
    try {
        await waitUntilSync(endpoint, startingBlockHeight + 3, pollingInterval, timeout);
        return "green";
    }
    catch (e) {
        return "red";
    }
}
function getEndpoint(ip, vcid) {
    return `${ip}/vchains/${vcid}`;
}
async function getStatus(ips, pollingInterval, timeout) {
    const results = {};
    lodash_1.map(ips, (endpoint, name) => {
        results[name] = bluebird_1.default.props({
            blockHeight: getBlockHeight(endpoint),
            status: determineStatus(endpoint, pollingInterval, timeout),
            version: getVersion(endpoint),
            commit: getCommit(endpoint),
            ethereum: getEthereumStats(endpoint),
        });
    });
    return bluebird_1.default.props(results);
}
exports.default = {
    waitUntil,
    waitUntilSync,
    waitUntilVersion,
    waitUntilCommit,
    getBlockHeight,
    getVersion,
    getCommit,
    getMetrics,
    getStatus,
    getEndpoint
};
//# sourceMappingURL=metrics.js.map