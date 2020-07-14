const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const path = require('path');
const _ = require('lodash');
const harness = require('./harness');
const { waitUntilSync, getBlockHeight } = require('./../../lib/metrics');
const { create, destroy, update } = require('./../../lib/cli/cli');

const basePath = path.join(__dirname, 'private-network/nodes');

let elasticIPs = [],
    nodesJSONs = [],
    nebulaCreationStepMarker = false,
    nebulaCreate4thNodeMarker = false;

/**
 * We don't run this test in CI that's why it's skipped.
 * It's too long and should be used only in case you want to run a more complete suite.
 */

describe.skip('nebula setup a private network', () => {
    before(async () => {
        const regions = harness.fixtures.nodes.map(({ region }) => region);
        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL SETUP START **********');
        console.log('Getting 4 Elastic IPs in the following regions: ', regions);

        elasticIPs = await harness.getElasticIPsInRegions(regions);

        console.log('Got back the following IP allocations results from AWS:', elasticIPs);

        console.log('Creating nebula "node.json" files...');
        nodesJSONs = harness.getNodesJSONs({ elasticIPs });
        console.log('Got: ', nodesJSONs);

        console.log('Attempting to write "node.json" files to disc...');
        await harness.writeNodesJSONsToDisc(nodesJSONs);

        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL SETUP FINISHED **********');
    });

    it('should provision a 3 node network and then join a 4th node', async () => {
        const _3_nodes = _.take(nodesJSONs, 3);
        const lastNode = _.last(nodesJSONs);

        // We write the configs so that they reflect only 3 nodes in the network.
        harness.writeConfigurationFiles(_3_nodes);

        const firstEndpoint = `${_3_nodes[0].publicIp}/vchains/10000`;

        // We create the paths to the JSON files created before since
        // that's the way to trigger create() the right way so that all file paths
        // will be resolved according to file mode. (nebula create -f <path-to-json>)

        const nodes = [1, 2, 3].map((n) => {
            return {
                file: path.join(basePath, `node${n}.json`)
            };
        });

        console.log('********** NEBULA CREATE 3 NODES OF PRIVATE BLOCKCHAIN BEGIN ***********');
        nebulaCreationStepMarker = true;
        await Promise.all(nodes.map(create));
        console.log('********** NEBULA CREATE 3 NODES OF PRIVATE BLOCKCHAIN END ***********');

        const pollInterval = 30 * 1000;
        const pollTimeout = 30 * 60 * 1000;

        // Wait for the network to sync correctly
        await waitUntilSync(firstEndpoint, 10, pollInterval, pollTimeout);
        let blockHeight = await getBlockHeight(firstEndpoint);

        expect(blockHeight, 'block height should advance').to.be.gte(10);

        // at this stage we have a running network of 3 nodes able to close blocks
        // Now we will add a 4th node to the network and update the network configuration
        // for the existing 3 nodes

        harness.writeConfigurationFiles(nodesJSONs);

        console.log('********** NEBULA CREATE 4TH NODE BEGIN ***********');
        await create({ file: path.join(basePath, 'node4.json') });
        nebulaCreate4thNodeMarker = true;
        console.log('********** NEBULA CREATE 4TH NODE END ***********');

        const lastEndpoint = `${lastNode.publicIp}/vchains/10000`;

        console.log('********** NEBULA UPDATE FIRST 3 NODES TOPOLOGY BEGIN ***********');
        await Promise.all(nodes.map(update));
        console.log('********** NEBULA UPDATE FIRST 3 NODES TOPOLOGY END ***********');

        blockHeight = await getBlockHeight(firstEndpoint);

        // wait until the last node had synced with others
        await waitUntilSync(lastEndpoint, blockHeight + 3, pollInterval, pollTimeout);

        // check again that the last node advances, not just syncs
        await waitUntilSync(lastEndpoint, blockHeight + 5, pollInterval, pollTimeout);
    });

    after(async () => {
        let destructors = [];
        console.log('*********** NEBULA NODES DESTRUCTION START **************');

        if (nebulaCreationStepMarker) {
            let nodes = [1, 2, 3].map((n) => {
                return {
                    file: path.join(basePath, `node${n}.json`)
                };
            });

            destructors.push(..._.take(nodes, 3).map(destroy));
        }

        if (nebulaCreate4thNodeMarker) {
            destructors.push(destroy({ file: path.join(basePath, 'node4.json') }));
        }
        await Promise.all(destructors);
        console.log('*********** NEBULA NODES DESTRUCTION END **************');
    });

    after(async () => {
        const validElasticIPs = elasticIPs.filter(o => o.ok === true);
        console.log('Releasing the following Elastic IPs from our AWS account: ', validElasticIPs);
        const elasticIPsReleaseResults = await Promise.all(validElasticIPs
            .map(({ ip, region }) => harness.aws.destroyPublicIp(region, ip)));
        console.log('Result of releasing Elastic IPs: ', elasticIPsReleaseResults);
    });

    after(() => harness.deleteNodesJSONsFromDisk(nodesJSONs));
});