"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const harness_1 = __importDefault(require("./harness"));
const metrics_1 = require("../../lib/metrics");
const cli_1 = require("../../lib/cli/cli");
let elasticIPs = [], nodesJSONs = [], singleNode, nebulaCreationStepMarker = false;
mocha_1.describe('nebula upgrade node version', () => {
    mocha_1.before(async () => {
        singleNode = harness_1.default.fixtures.nodes.splice(0, 1)[0];
        console.log('********* NEBULA UPGRADE VERSION SETUP START **********');
        console.log('Getting an Elastic IP in the following region: ', singleNode.region);
        elasticIPs = await harness_1.default.getElasticIPsInRegions([singleNode.region]);
        console.log('Got back the following IP allocation result from AWS:', elasticIPs);
        const validIPsCount = elasticIPs.filter(o => o.ok === true).length;
        if (validIPsCount !== 1) {
            throw new Error('Not all Elastic IPs required were allocated');
        }
        console.log('Creating nebula "node.json" file...');
        nodesJSONs = harness_1.default.getNodesJSONs({ elasticIPs }, [singleNode]);
        console.log('Got: ', nodesJSONs);
        singleNode = nodesJSONs[0];
        console.log('Attempting to write "node.json" files to disc...');
        await harness_1.default.writeNodesJSONsToDisc(nodesJSONs);
        console.log('********* NEBULA UPGRADE VERSION TEST GLOBAL SETUP FINISHED **********');
    });
    mocha_1.it('should upgrade the binary version for a constellation', async () => {
        harness_1.default.writeConfigurationFiles(nodesJSONs);
        const endpoint = `${singleNode.publicIp}/vchains/10000`;
        const fileObject = { file: path_1.default.join(__dirname, '/private-network/nodes/node1.json') };
        await cli_1.create(fileObject);
        nebulaCreationStepMarker = true;
        // This is a known bug, the binary from the tag v0.8.0 will still report an old version
        await metrics_1.waitUntilVersion(endpoint, 'v0.7.0');
        const version = await metrics_1.getVersion(endpoint);
        chai_1.expect(version, 'versions should match').to.be.eql('v0.7.0');
        const upgradedNode = lodash_1.default.merge({}, singleNode, {
            chainVersion: 'v0.8.1'
        });
        await harness_1.default.writeNodesJSONsToDisc([upgradedNode]);
        await cli_1.update(fileObject);
        await metrics_1.waitUntilVersion(endpoint, 'v0.8.1');
        const currentVersion = await metrics_1.getVersion(endpoint);
        chai_1.expect(currentVersion, 'versions should match').to.be.eql('v0.8.1');
    });
    mocha_1.after(async () => {
        console.log('*********** NEBULA NODES DESTRUCTION START **************');
        if (nebulaCreationStepMarker) {
            await cli_1.destroy(singleNode).catch(err => err);
        }
        console.log('*********** NEBULA NODES DESTRUCTION END **************');
        console.log('********* NEBULA UPGRADE VERSION TEST GLOBAL TEARDOWN START **********');
        const validElasticIPs = elasticIPs.filter(o => o.ok === true);
        console.log('Releasing the following Elastic IPs from our AWS account: ', validElasticIPs);
        const elasticIPsReleaseResults = await Promise.all(validElasticIPs
            .map(({ ip, region }) => harness_1.default.aws.destroyPublicIp(region, ip)));
        console.log('Result of releasing Elastic IPs: ', elasticIPsReleaseResults);
        console.log('Deleting "node.json" files...');
        await harness_1.default.deleteNodesJSONsFromDisk(nodesJSONs);
        console.log('********* NEBULA UPGRADE VERSION TEST GLOBAL TEARDOWN FINISHED **********');
    });
});
//# sourceMappingURL=upgrade-node-version-test.js.map