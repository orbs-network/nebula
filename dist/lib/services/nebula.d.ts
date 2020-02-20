declare class Nebula {
    constructor();
    setTerraformCachePath(cachePath: any): void;
    createConstellation({ cloud, keys, }: {
        cloud?: {} | undefined;
        keys?: {} | undefined;
    }): Promise<any>;
    destroyConstellation({ name }: {
        name: any;
    }): Promise<any>;
}
declare const _default: {
    Nebula: typeof Nebula;
};
export default _default;
//# sourceMappingURL=nebula.d.ts.map