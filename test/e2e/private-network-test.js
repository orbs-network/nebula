const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const path = require('path');
const _ = require('lodash');
const harness = require('./harness');
const { waitUntilSync, getBlockHeight } = require('./../../lib/metrics');
const { create, destroy, update } = require('./../../lib/cli/cli');

let elasticIPs = [],
    nodesJSONs = [],
    nebulaCreationStepMarker = false,
    nebulaCreate4thNodeMarker = false;

describe('nebula setup a private network', () => {
    before(async () => {
        const regions = harness.fixtures.nodes.map(({ region }) => region);
        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL SETUP START **********');
        console.log('Getting 4 Elastic IPs in the following regions: ', regions);

        elasticIPs = await harness.getElasticIPsInRegions(regions);

        console.log('Got back the following IP allocations results from AWS:', elasticIPs);

        const validIPsCount = elasticIPs.filter(o => o.ok === true).length;

        if (validIPsCount < 4) {
            // Not all IPs were allocated!
            throw new Error('Not all Elastic IPs required were allocated');
        }

        console.log('Creating nebula "node.json" files...')
        nodesJSONs = harness.getNodesJSONs({ elasticIPs });
        console.log('Got: ', nodesJSONs);

        console.log('Attempting to write "node.json" files to disc...');
        await harness.writeNodesJSONsToDisc(nodesJSONs);

        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL SETUP FINISHED **********');
    });

    it.only('should provision a 3 node network and then join a 4th node', async () => {
        const _3_nodes = _.take(nodesJSONs, 3);
        const lastNode = _.last(nodesJSONs);

        // We write the configs so that they reflect only 3 nodes in the network.
        harness.writeConfigurationFiles(_3_nodes);

        const firstEndpoint = `${_3_nodes[0].publicIp}/vchains/10000`;

        // We create the paths to the JSON files created before since
        // that's the way to trigger create() the right way so that all file paths
        // will be resolved according to file mode. (nebula create -f <path-to-json>)
        const basePath = path.join(__dirname, 'private-network/nodes');
        const nodes = [1, 2, 3].map((n) => {
            return {
                file: path.join(basePath, `node${n}.json`)
            };
        });

        console.log('********** NEBULA CREATE 3 NODES OF PRIVATE BLOCKCHAIN BEGIN ***********');
        const creations = nodes.map((node) => create(node).catch(err => err));
        const results = await Promise.all(creations);
        nebulaCreationStepMarker = true;
        console.log('********** NEBULA CREATE 3 NODES OF PRIVATE BLOCKCHAIN END ***********');

        const errornousCreations = results.filter(r => r.ok === false);
        expect(errornousCreations.length, 'Expecting no failures creating the 3 nodes').to.equal(0);

        // Wait for the network to sync correctly
        await waitUntilSync(firstEndpoint, 10);
        const blockHeight = await getBlockHeight(firstEndpoint);

        expect(blockHeight, 'block height should advance').to.be.gte(10);

        // at this stage we have a running network of 3 nodes able to close blocks
        // Now we will add a 4th node to the network and update the network configuration
        // for the existing 3 nodes

        harness.writeConfigurationFiles(nodesJSONs);

        console.log('********** NEBULA CREATE 4TH NODE BEGIN ***********');
        const resultNode4 = await create({ file: path.join(basePath, 'node4.json') }).catch(err => err);
        expect(resultNode4.ok).to.equal(true);
        nebulaCreate4thNodeMarker = true;
        console.log('********** NEBULA CREATE 4TH NODE END ***********');

        const lastEndpoint = `${lastNode.publicIp}/vchains/10000`;

        console.log('********** NEBULA UPDATE FIRST 3 NODES TOPOLOGY BEGIN ***********');
        
        const updateResults = await Promise.all(nodes.map((node) => update(node).catch(err => err)));
        const successfulUpdates = updateResults.filter(r => r.ok === true);

        expect(successfulUpdates.length, 'Expect all 3 updates to work correctly').to.equal(3);
        console.log('********** NEBULA UPDATE FIRST 3 NODES TOPOLOGY END ***********');

        // wait until the last node had synced with others
        await waitUntilSync(lastEndpoint, 30);

        // check again that the first node keeps advancing too
        const firstNodeBlockHeight = await getBlockHeight(firstEndpoint);
        expect(firstNodeBlockHeight, "block height should advance with 4th node added").to.be.gte(30);

        // check again that the last node advances, not just syncs
        await waitUntilSync(lastEndpoint, firstNodeBlockHeight + 10);

        const lastNodeBlockHeight = await getBlockHeight(lastEndpoint);
        expect(lastNodeBlockHeight, "block height should advance with 4th node added").to.be.gte(firstNodeBlockHeight + 10);
    });

    after(async () => {
        console.log('*********** NEBULA NODES DESTRUCTION START **************');
        if (nebulaCreationStepMarker) {
            await Promise
                .all(_.take(nodesJSONs, 3).map((node) => destroy(node).catch(err => err)));
        }
        if (nebulaCreate4thNodeMarker) {
            await destroy(_.last(nodesJSONs)).catch(err => err);
        }
        console.log('*********** NEBULA NODES DESTRUCTION END **************');

        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL TEARDOWN START **********');
        const validElasticIPs = elasticIPs.filter(o => o.ok === true);
        console.log('Releasing the following Elastic IPs from our AWS account: ', validElasticIPs);
        const elasticIPsReleaseResults = await Promise.all(validElasticIPs
            .map(({ ip, region }) => harness.aws.destroyPublicIp(region, ip)));
        console.log('Result of releasing Elastic IPs: ', elasticIPsReleaseResults);

        console.log('Deleting "node.json" files...');
        await harness.deleteNodesJSONsFromDisk(nodesJSONs);

        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL TEARDOWN FINISHED **********');
    });
});