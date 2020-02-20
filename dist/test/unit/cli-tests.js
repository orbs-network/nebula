"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = __importDefault(require("chai"));
const chai_asserttype_1 = __importDefault(require("chai-asserttype"));
chai_1.default.use(chai_asserttype_1.default);
const { expect } = chai_1.default;
const create_config_1 = require("../../lib/cli/boyar/create-config");
mocha_1.describe("cli", () => {
    mocha_1.describe("#getNodes", () => {
        mocha_1.it("returns the list of the nodes", () => {
            const nodes = create_config_1.getNodes({
                configPath: `${__dirname}/templates`
            });
            expect(nodes).to.be.eql({
                "e2e-test-node1": "52.57.222.178",
                "e2e-test-node2": "63.35.73.209",
                "e2e-test-node3": "35.178.161.247"
            });
        });
    });
});
//# sourceMappingURL=cli-tests.js.map