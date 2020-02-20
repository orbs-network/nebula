import AWS from 'aws-sdk';
declare function exec(cmd: any, opts: any): Promise<any>;
declare const _default: {
    exec: typeof exec;
    fixtures: {
        "nodes": {
            "name": string;
            "orbsAddress": string;
            "orbsPrivateKey": string;
            "region": string;
        }[];
    };
    writeNodesJSONsToDisc(jsons: any): Promise<[unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]>;
    deleteNodesJSONsFromDisk(jsons: any): Promise<[unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]>;
    getElasticIPsInRegions(regions: any): Promise<[unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]>;
    writeBoyarConfig(): void;
    writeConfigurationFiles(nodes: any): void;
    aws: {
        getPublicIp(region: any): Promise<{
            ok: boolean;
            region: any;
            ip: string | undefined;
            err?: undefined;
        } | {
            ok: boolean;
            region: any;
            err: any;
            ip?: undefined;
        }>;
        destroyPublicIp(region: any, ip: any): Promise<{
            ok: boolean;
            region: any;
            ip: any;
            result: {
                $response: AWS.Response<{}, AWS.AWSError>;
            };
            err?: undefined;
        } | {
            ok: boolean;
            region: any;
            ip: any;
            err: any;
            result?: undefined;
        }>;
    };
    getNodesJSONs({ elasticIPs, buildNumber }: {
        elasticIPs: any;
        buildNumber?: any;
    }, nodes?: {
        "name": string;
        "orbsAddress": string;
        "orbsPrivateKey": string;
        "region": string;
    }[]): ({
        "name": string;
        "orbsAddress": string;
        "orbsPrivateKey": string;
        "region": string;
    } & {
        sshPublicKey: string;
        configPath: string;
        incomingSshCidrBlocks: string[];
        awsProfile: string;
        nodeSize: string;
        nodeCount: number;
    } & {
        publicIp: any;
    })[];
    remoteExec({ command, ip }: {
        command: any;
        ip: any;
    }): any;
    eventuallyReady({ ip, boyar, address }: {
        ip: any;
        boyar: any;
        address: any;
    }): Promise<void>;
    checkEBSFingerprint({ outputs }: {
        outputs: any;
    }): Promise<{
        ok: boolean;
        fingerprint: null;
        error: any;
    } | {
        ok: boolean;
        error: null;
        fingerprint: any;
    }>;
};
export default _default;
//# sourceMappingURL=harness.d.ts.map