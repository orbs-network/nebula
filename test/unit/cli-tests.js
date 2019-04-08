const _ = require("lodash");
const {
    describe,
    it
} = require("mocha");
const chai = require("chai");
const asserttype = require("chai-asserttype");
chai.use(asserttype);

const {
    expect
} = chai;

const {
    getNodes
} = require("../../lib/cli/boyar/create-config");

describe("cli", () => {
    describe("#getNodes", () => {
        it("returns the list of the nodes", () => {
            const nodes = getNodes({
                configPath: `${__dirname}/templates`
            });

            expect(nodes).to.be.eql({
                "e2e-test-node1": "52.57.222.178",
                "e2e-test-node2": "63.35.73.209",
                "e2e-test-node3": "35.178.161.247"
            });
        });
    })
});
