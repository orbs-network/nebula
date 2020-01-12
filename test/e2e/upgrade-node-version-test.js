const { describe, before, after, it } = require('mocha');
const { expect } = require('chai');
const _ = require('lodash');
const path = require('path');
const harness = require('./harness');
const { waitUntilVersion, getVersion } = require('./../../lib/metrics');
const { create, destroy, update } = require('./../../lib/cli/cli');

let elasticIPs = [],
    nodesJSONs = [],
    singleNode,
    nebulaCreationStepMarker = false;

describe('nebula upgrade node version', () => {
    before(async () => {
        singleNode = harness.fixtures.nodes.splice(0, 1)[0];
        console.log('********* NEBULA UPGRADE VERSION SETUP START **********');
        console.log('Getting an Elastic IP in the following region: ', singleNode.region);

        elasticIPs = await harness.getElasticIPsInRegions([singleNode.region]);

        console.log('Got back the following IP allocation result from AWS:', elasticIPs);

        console.log('Creating nebula "node.json" file...');
        nodesJSONs = harness.getNodesJSONs({ elasticIPs }, [singleNode]);
        console.log('Got: ', nodesJSONs);
        singleNode = nodesJSONs[0];

        console.log('Attempting to write "node.json" files to disc...');
        await harness.writeNodesJSONsToDisc(nodesJSONs);

        console.log('********* NEBULA UPGRADE VERSION TEST GLOBAL SETUP FINISHED **********');
    });

    it('should upgrade the binary version for a constellation', async () => {
        harness.writeConfigurationFiles(nodesJSONs);

        const endpoint = `${singleNode.publicIp}/vchains/10000`;
        const fileObject = { file: path.join(__dirname, '/private-network/nodes/node1.json') };
        await create(fileObject);
        nebulaCreationStepMarker = true;

        // This is a known bug, the binary from the tag v0.8.0 will still report an old version
        await waitUntilVersion(endpoint, 'v0.7.0');
        const version = await getVersion(endpoint);
        expect(version, 'versions should match').to.be.eql('v0.7.0');

        const upgradedNode = _.merge({}, singleNode, {
            chainVersion: 'v0.8.1'
        });

        await harness.writeNodesJSONsToDisc([upgradedNode]);

        await update(fileObject);

        await waitUntilVersion(endpoint, 'v0.8.1');
        const currentVersion = await getVersion(endpoint);
        expect(currentVersion, 'versions should match').to.be.eql('v0.8.1');
    });

    after(async () => {
        console.log('*********** NEBULA NODES DESTRUCTION START **************');
        if (nebulaCreationStepMarker) {
            await destroy(singleNode).catch(err => err);
        }

        console.log('*********** NEBULA NODES DESTRUCTION END **************');

        console.log('********* NEBULA UPGRADE VERSION TEST GLOBAL TEARDOWN START **********');
        const validElasticIPs = elasticIPs.filter(o => o.ok === true);
        console.log('Releasing the following Elastic IPs from our AWS account: ', validElasticIPs);
        const elasticIPsReleaseResults = await Promise.all(validElasticIPs
            .map(({ ip, region }) => harness.aws.destroyPublicIp(region, ip)));
        console.log('Result of releasing Elastic IPs: ', elasticIPsReleaseResults);

        console.log('Deleting "node.json" files...');
        await harness.deleteNodesJSONsFromDisk(nodesJSONs);

        console.log('********* NEBULA UPGRADE VERSION TEST GLOBAL TEARDOWN FINISHED **********');
    });
});