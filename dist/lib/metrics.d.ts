declare function getMetrics(endpoint: any): Promise<any>;
declare function getBlockHeight(endpoint: any): Promise<any>;
declare function getVersion(endpoint: any): Promise<any>;
declare function getCommit(endpoint: any): Promise<any>;
declare function waitUntil(targetValueOrTestFunc: any, pollingFunc: any, pollingInterval: any, timeout: any): Promise<any>;
declare function waitUntilSync(endpoint: any, targetBlockHeight: any, pollingInterval: any, timeout: any): Promise<any>;
declare function waitUntilVersion(endpoint: any, targetVersion: any): Promise<any>;
declare function waitUntilCommit(endpoint: any, targetCommit: any): Promise<any>;
declare function getEndpoint(ip: any, vcid: any): string;
declare function getStatus(ips: any, pollingInterval: any, timeout: any): Promise<any>;
declare const _default: {
    waitUntil: typeof waitUntil;
    waitUntilSync: typeof waitUntilSync;
    waitUntilVersion: typeof waitUntilVersion;
    waitUntilCommit: typeof waitUntilCommit;
    getBlockHeight: typeof getBlockHeight;
    getVersion: typeof getVersion;
    getCommit: typeof getCommit;
    getMetrics: typeof getMetrics;
    getStatus: typeof getStatus;
    getEndpoint: typeof getEndpoint;
};
export default _default;
//# sourceMappingURL=metrics.d.ts.map