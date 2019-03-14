const { describe, it } = require('mocha');
const { expect } = require('chai');
const harness = require('./harness');

let elasticIPs = [],
    nodesJSONs = [];

describe.only('nebula setup a private network', () => {
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
        await new Promise((r) => { setTimeout(r, 3000); });

    });

    after(async () => {
        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL TEARDOWN START **********');
        const validElasticIPs = elasticIPs.filter(o => o.ok === true);
        console.log('Releasing the following Elastic IPs from our AWS account: ', validElasticIPs);
        const elasticIPsReleaseResults = await Promise.all(validElasticIPs
            .map(({ ip, region }) => harness.aws.destroyPublicIp(region, ip)));
        console.log('Result of releasing Elastic IPs: ', elasticIPsReleaseResults);

        console.log('Deleting "node.json" files...');
        await harness.deleteNodesJSONsFromDisk(nodesJSONs);
        console.log('********* NEBULA PRIVATE BLOCKCHAIN TEST GLOBAL TEARDOWN STOP **********');
    });

    it('should provision a 3 node network and then join a 4th node', async () => {
        console.log('within the test itself');
        // const nodes = await getNodes();
        // const _3_nodes = _.take(nodes, 3);
        // const lastNode = _.last(nodes);

        // try {
        //     saveConfig(_3_nodes);

        //     const firstEndpoint = `${_3_nodes[0].publicIp}/vchains/10000`;

        //     console.log('********** NEBULA CREATE 3 NODES OF PRIVATE BLOCKCHAIN BEGIN ***********');
        //     const creations = _3_nodes.map((node) => create(node).catch(err => err));
        //     const results = await Promise.all(creations);
        //     console.log('********** NEBULA CREATE 3 NODES OF PRIVATE BLOCKCHAIN END ***********');

        //     const errornousCreations = results.filter(r => r.ok === false);
        //     expect(errornousCreations.length).to.equal(0);

        //     // Wait for the network to sync correctly
        //     await waitUntilSync(firstEndpoint, 10);
        //     const blockHeight = await getBlockHeight(firstEndpoint);

        //     expect(blockHeight, "block height should advance").to.be.gte(10);

        //     // at this stage we have a running network of 3 nodes able to close blocks
        //     // Now we will add a 4th node to the network and update the network configuration
        //     // for the existing 3 nodes

        //     saveConfig(nodes);

        //     const resultNode4 = await create(lastNode).catch(err => err);
        //     expect(resultNode4.ok).to.equal(true);

        //     const lastEndpoint = `${lastNode.publicIp}/vchains/10000`;

        //     // TODO: check that update was successful on all nodes
        //     const updateResults = await Promise.all(_.map(_3_nodes, (node) => update(node).catch(err => err)));
        //     const successfulUpdates = updateResults.filter(r => r.ok === true);
        //     expect(successfulUpdates.length, 'Expect all 3 updates to work correctly').to.equal(3);

        //     // wait until the last node had synced with others
        //     await waitUntilSync(lastEndpoint, 30);

        //     // check again that the first node keeps advancing too
        //     const firstNodeBlockHeight = await getBlockHeight(firstEndpoint);
        //     expect(firstNodeBlockHeight, "block height should advance with 4th node added").to.be.gte(30);

        //     // check again that the last node advances, not just syncs
        //     await waitUntilSync(lastEndpoint, firstNodeBlockHeight + 10);

        //     const lastNodeBlockHeight = await getBlockHeight(lastEndpoint);
        //     expect(lastNodeBlockHeight, "block height should advance with 4th node added").to.be.gte(firstNodeBlockHeight + 10);

        //     // TODO: Add a contract call before adding the 4th node and another GET call to check the
        //     // value exists afterwards and accessible from the 4th node (check syncing)
        // } finally {
        //     await Promise.all(_.map(nodes, (node) => destroy(node).catch(err => err)));

        //     await Promise.all(_.map(nodes, (node) => {
        //         return destroyPublicIp(node.region, node.publicIp);
        //     }));
        // }
    });
});