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
const update_1 = require("../../lib/cli/handlers/update");
mocha_1.describe('_create', () => {
    mocha_1.it('generates keys and cloud objects from input', () => {
        const { tempFileName, boyarConfig, command } = update_1._update({
            "name": "mumbai-node4",
            "awsProfile": "default",
            "region": "ap-south-1",
            "configPath": "./templates",
            // pretend we're in file mode
            "fileMode": true,
            "__fileDirname": __dirname,
        });
        expect(tempFileName).to.include("/tmp/boyar-mumbai-node4.config.json");
        expect(boyarConfig).not.to.be.empty;
        expect(command.match(`aws s3 cp --region ap-south-1 --acl public-read  /tmp/boyar-mumbai-node4.config.json-\\d* s3://boyar-mumbai-node4/boyar/config.json`)).lengthOf(1);
    });
});
//# sourceMappingURL=update-tests.js.map