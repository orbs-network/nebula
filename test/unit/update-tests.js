const { describe, it } = require('mocha');
const chai = require('chai');
const asserttype = require('chai-asserttype');
chai.use(asserttype);

const { expect } = chai;

const { _update } = require("../../lib/cli/handlers/update");

describe('_create', () => {
    it('generates keys and cloud objects from input', () => {
        const { tempFileName, boyarConfig, command } = _update({
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
        expect(command.match(`aws s3 cp --region ap-south-1 --acl public-read --profile default /tmp/boyar-mumbai-node4.config.json-\\d* s3://boyar-mumbai-node4/boyar/config.json`)).lengthOf(1);
    });
});
