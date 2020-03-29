const { createBoyarConfig } = require('./../boyar/create-config');
const types = require('./../../../constants/types');
const { resolvePath } = require("../../utils/resolve-path");
const _ = require('lodash');

module.exports = {
    prepareArgsForNebulaOps({
        fileMode, __fileDirname, _configPath, _sshPublicKey, _catchPath,
        chainVersion, ethereumTopologyContractAddress, sslCertificatePath, sslPrivateKeyPath,
        orbsAddress, orbsPrivateKey, awsProfile, incomingSshCidrBlocks, ethereumEndpoint,
        region, backend, nodeSize, nodeCount, bootstrapUrl, name,
    }) {
        let configPath = _configPath;
        let boyarConfig = {};
        let sshPublicKey = _sshPublicKey;
        let cachePath = _catchPath;

        // Expand cache path
        if (cachePath !== undefined) {
            cachePath = resolvePath(cachePath, fileMode ? __fileDirname : process.cwd());
        } else {
            cachePath = resolvePath("~/.nebula");
        }

        // Expand SSH public key path
        if (fileMode) {
            sshPublicKey = resolvePath(sshPublicKey, __fileDirname);
        }

        if (!_.isEmpty(configPath)) {
            configPath = resolvePath(_configPath, fileMode ? __fileDirname : process.cwd());

            // do not generate boyar config if configPath is missing
            boyarConfig = createBoyarConfig({
                configPath,
                chainVersion,
                skipNetworkTopology: !_.isEmpty(ethereumTopologyContractAddress)
            });
        }

        if (!_.isEmpty(sslCertificatePath)) {
            sslCertificatePath = resolvePath(sslCertificatePath, __fileDirname);
        }

        if (!_.isEmpty(sslPrivateKeyPath)) {
            sslPrivateKeyPath = resolvePath(sslPrivateKeyPath, __fileDirname);
        }

        const keys = {
            aws: {
                profile: awsProfile,
            },
            ssh: {
                path: sshPublicKey,
                cidr: incomingSshCidrBlocks,
            },
            orbs: {
                nodeKeys: {
                    address: orbsAddress,
                    privateKey: orbsPrivateKey,
                },
                boyarConfig,
                ethereumTopologyContractAddress,
                ethereumEndpoint,
            },
            ssl: {
                sslCertificatePath,
                sslPrivateKeyPath,
            }
        };

        const cloud = {
            type: types.clouds.aws,
            region,
            backend,
            instanceType: nodeSize,
            nodeCount: nodeCount,
            bootstrapUrl,
            cachePath,
        };

        if (name !== '' && name.length > 0) {
            cloud.name = name;
        }

        return {
            cloud,
            keys,
        };
    }
};