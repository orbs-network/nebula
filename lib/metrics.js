const {
    isObject,
    isInteger,
    isFunction,
    startsWith,
    map
} = require("lodash");
const request = require("request-promise");
const Promise = require("bluebird");

async function getMetrics(endpoint) {
    try {
        const body = await request(`http://${endpoint}/metrics`, {
            timeout: 2000,
        });
        return JSON.parse(body)
    } catch (e) {
        // Suppressed errors
        // console.error(`${e.message}: ${endpoint}`);
        return {};
    }
}

function getGauge(metrics, name) {
    return isObject(metrics[name]) ? metrics[name].Value : 0;
}

function getText(metrics, name) {
    return isObject(metrics[name]) ? metrics[name].Value : "";
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
    if (!isInteger(pollingInterval)) {
        pollingInterval = 100;
    }

    if (!isInteger(timeout)) {
        timeout = Infinity;
    }

    return new Promise((resolve, reject) => {
        const start = new Date().getTime();
        const wrappedPoll = async () => {
            try {
                const value = await pollingFunc();

                let test = (value) => {
                    return value >= targetValueOrTestFunc;
                };

                if (isFunction(targetValueOrTestFunc)) {
                    test = targetValueOrTestFunc;
                }

                if (test(value)) {
                    clearInterval(interval);
                    resolve(Date.now() - start);
                }
            } catch (e) {
                clearInterval(interval);
                reject(e);
            }
        }

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
        return startsWith(commit, targetVersion);
    }, async () => {
        return getVersion(endpoint);
    }, _5_seconds, _15_minutes);
}

async function waitUntilCommit(endpoint, targetCommit) {
    const _5_seconds = 5000;
    const _15_minutes = 60 * 15 * 1000;

    console.log(`Waiting for ${endpoint} to update commit...`);

    return waitUntil((commit) => {
        return startsWith(commit, targetCommit);
    }, async () => {
        return getCommit(endpoint);
    }, _5_seconds, _15_minutes);
}


async function determineStatus(endpoint, pollingInterval, timeout) {
    const startingBlockHeight = await getBlockHeight(endpoint);
    try {
        await waitUntilSync(endpoint, startingBlockHeight + 3, pollingInterval, timeout);
        return "green";
    } catch (e) {
        return "red";
    }
}

function getEndpoint(ip, vcid) {
    return `${ip}/vchains/${vcid}`;
}

async function getStatus(ips, pollingInterval, timeout) {
    const results = {};

    map(ips, (endpoint, name) => {
        results[name] = Promise.props({
            blockHeight: getBlockHeight(endpoint),
            status: determineStatus(endpoint, pollingInterval, timeout),
            version: getVersion(endpoint),
            commit: getCommit(endpoint),
            ethereum: getEthereumStats(endpoint),
        });
    });

    return Promise.props(results);
}

module.exports = {
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
}
