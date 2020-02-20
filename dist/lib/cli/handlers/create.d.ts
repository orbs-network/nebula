declare function _create({ fileMode, __fileDirname, awsProfile, sshPublicKey: _sshPublicKey, orbsAddress, orbsPrivateKey, region, nodeSize, publicIp, nodeCount, cachePath: _catchPath, name, bootstrapUrl, configPath: _configPath, chainVersion, ethereumEndpoint, ethereumTopologyContractAddress, incomingSshCidrBlocks, sslCertificatePath, sslPrivateKeyPath, }: {
    fileMode?: boolean | undefined;
    __fileDirname?: string | undefined;
    awsProfile: any;
    sshPublicKey: any;
    orbsAddress: any;
    orbsPrivateKey: any;
    region: any;
    nodeSize: any;
    publicIp: any;
    nodeCount: any;
    cachePath: any;
    name: any;
    bootstrapUrl: any;
    configPath: any;
    chainVersion: any;
    ethereumEndpoint: any;
    ethereumTopologyContractAddress: any;
    incomingSshCidrBlocks: any;
    sslCertificatePath: any;
    sslPrivateKeyPath: any;
}): {
    keys: {
        aws: {
            profile: any;
        };
        ssh: {
            path: any;
            cidr: any;
        };
        orbs: {
            nodeKeys: {
                address: any;
                privateKey: any;
            };
            boyarConfig: {};
            ethereumTopologyContractAddress: any;
            ethereumEndpoint: any;
        };
        ssl: {
            sslCertificatePath: any;
            sslPrivateKeyPath: any;
        };
    };
    cloud: {
        type: string;
        region: any;
        instanceType: any;
        nodeCount: any;
        bootstrapUrl: any;
        cachePath: any;
    };
};
declare const _default: {
    create: any;
    _create: typeof _create;
};
export default _default;
//# sourceMappingURL=create.d.ts.map