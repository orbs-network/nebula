"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const harness_1 = __importDefault(require("./harness"));
const metrics_1 = require("../../lib/metrics");
const cli_1 = require("../../lib/cli/cli");
let elasticIPs = [], nodesJSONs = [], nebulaCreationStepMarker = false, nebulaCreate4thNodeMarker = false;
mocha_1.describe('nebula setup a private network', () => {
    mocha_1.before(async () => {
        const regions = harness_1.default.fixtures.nodes.map(({ region }) => region);
        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL SETUP START **********');
        console.log('Getting 4 Elastic IPs in the following regions: ', regions);
        elasticIPs = await harness_1.default.getElasticIPsInRegions(regions);
        console.log('Got back the following IP allocations results from AWS:', elasticIPs);
        const validIPsCount = elasticIPs.filter(o => o.ok === true).length;
        if (validIPsCount < 4) {
            // Not all IPs were allocated!
            throw new Error('Not all Elastic IPs required were allocated');
        }
        console.log('Creating nebula "node.json" files...');
        nodesJSONs = harness_1.default.getNodesJSONs({ elasticIPs });
        console.log('Got: ', nodesJSONs);
        console.log('Attempting to write "node.json" files to disc...');
        await harness_1.default.writeNodesJSONsToDisc(nodesJSONs);
        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL SETUP FINISHED **********');
    });
    mocha_1.it('should provision a 3 node network and then join a 4th node', async () => {
        const _3_nodes = lodash_1.default.take(nodesJSONs, 3);
        const lastNode = lodash_1.default.last(nodesJSONs);
        // We write the configs so that they reflect only 3 nodes in the network.
        harness_1.default.writeConfigurationFiles(_3_nodes);
        const firstEndpoint = `${_3_nodes[0].publicIp}/vchains/10000`;
        // We create the paths to the JSON files created before since
        // that's the way to trigger create() the right way so that all file paths
        // will be resolved according to file mode. (nebula create -f <path-to-json>)
        const basePath = path_1.default.join(__dirname, 'private-network/nodes');
        const nodes = [1, 2, 3].map((n) => {
            return {
                file: path_1.default.join(basePath, `node${n}.json`)
            };
        });
        console.log('********** NEBULA CREATE 3 NODES OF PRIVATE BLOCKCHAIN BEGIN ***********');
        const creations = nodes.map((node) => cli_1.create(node).catch(err => err));
        const results = await Promise.all(creations);
        nebulaCreationStepMarker = true;
        console.log('********** NEBULA CREATE 3 NODES OF PRIVATE BLOCKCHAIN END ***********');
        const errornousCreations = results.filter(r => r.ok === false);
        chai_1.expect(errornousCreations.length, 'Expecting no failures creating the 3 nodes').to.equal(0);
        // Wait for the network to sync correctly
        await metrics_1.waitUntilSync(firstEndpoint, 10);
        const blockHeight = await metrics_1.getBlockHeight(firstEndpoint);
        chai_1.expect(blockHeight, 'block height should advance').to.be.gte(10);
        // at this stage we have a running network of 3 nodes able to close blocks
        // Now we will add a 4th node to the network and update the network configuration
        // for the existing 3 nodes
        harness_1.default.writeConfigurationFiles(nodesJSONs);
        console.log('********** NEBULA CREATE 4TH NODE BEGIN ***********');
        const resultNode4 = await cli_1.create({ file: path_1.default.join(basePath, 'node4.json') }).catch(err => err);
        chai_1.expect(resultNode4.ok).to.equal(true);
        nebulaCreate4thNodeMarker = true;
        console.log('********** NEBULA CREATE 4TH NODE END ***********');
        const lastEndpoint = `${lastNode.publicIp}/vchains/10000`;
        console.log('********** NEBULA UPDATE FIRST 3 NODES TOPOLOGY BEGIN ***********');
        const updateResults = await Promise.all(nodes.map((node) => cli_1.update(node).catch(err => err)));
        const successfulUpdates = updateResults.filter(r => r.ok === true);
        chai_1.expect(successfulUpdates.length, 'Expect all 3 updates to work correctly').to.equal(3);
        console.log('********** NEBULA UPDATE FIRST 3 NODES TOPOLOGY END ***********');
        // wait until the last node had synced with others
        await metrics_1.waitUntilSync(lastEndpoint, 30);
        // check again that the first node keeps advancing too
        const firstNodeBlockHeight = await metrics_1.getBlockHeight(firstEndpoint);
        chai_1.expect(firstNodeBlockHeight, "block height should advance with 4th node added").to.be.gte(30);
        // check again that the last node advances, not just syncs
        await metrics_1.waitUntilSync(lastEndpoint, firstNodeBlockHeight + 10);
        const lastNodeBlockHeight = await metrics_1.getBlockHeight(lastEndpoint);
        chai_1.expect(lastNodeBlockHeight, "block height should advance with 4th node added").to.be.gte(firstNodeBlockHeight + 10);
    });
    mocha_1.after(async () => {
        console.log('*********** NEBULA NODES DESTRUCTION START **************');
        if (nebulaCreationStepMarker) {
            await Promise
                .all(lodash_1.default.take(nodesJSONs, 3).map((node) => cli_1.destroy(node).catch(err => err)));
        }
        if (nebulaCreate4thNodeMarker) {
            await cli_1.destroy(lodash_1.default.last(nodesJSONs)).catch(err => err);
        }
        console.log('*********** NEBULA NODES DESTRUCTION END **************');
        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL TEARDOWN START **********');
        const validElasticIPs = elasticIPs.filter(o => o.ok === true);
        console.log('Releasing the following Elastic IPs from our AWS account: ', validElasticIPs);
        const elasticIPsReleaseResults = await Promise.all(validElasticIPs
            .map(({ ip, region }) => harness_1.default.aws.destroyPublicIp(region, ip)));
        console.log('Result of releasing Elastic IPs: ', elasticIPsReleaseResults);
        console.log('Deleting "node.json" files...');
        await harness_1.default.deleteNodesJSONsFromDisk(nodesJSONs);
        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL TEARDOWN FINISHED **********');
    });
});
//# sourceMappingURL=private-network-test.js.map