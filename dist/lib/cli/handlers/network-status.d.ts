declare function status({ configPath, vchain }: {
    configPath: any;
    vchain: any;
}): Promise<{
    ok: boolean;
    result?: undefined;
} | {
    ok: boolean;
    result: any;
}>;
declare const _default: {
    status: typeof status;
    getNodes: any;
};
export default _default;
//# sourceMappingURL=network-status.d.ts.map