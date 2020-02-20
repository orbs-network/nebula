declare class Terraform {
    constructor();
    setCachePath(cachePath: any): void;
    setTargetPath(name: any): void;
    copyTerraformInfraTemplate({ cloud }: {
        cloud: any;
    }): Promise<void>;
    createTerraformVariablesFile({ cloud, keys }: {
        cloud: any;
        keys: any;
    }): any;
    writeTerraformVariablesFile({ cloud, keys }: {
        cloud: any;
        keys: any;
    }): Promise<void>;
    create({ cloud, keys }: {
        cloud: any;
        keys: any;
    }): Promise<{
        ok: boolean;
        tfPath: any;
        outputs: any;
        name: any;
        message?: undefined;
        error?: undefined;
    } | {
        ok: boolean;
        tfPath: any;
        message: string;
        error: any;
        outputs?: undefined;
        name?: undefined;
    }>;
    destroy({ name }: {
        name: any;
    }): Promise<{
        ok: boolean;
        tfPath: any;
        message?: undefined;
        error?: undefined;
    } | {
        ok: boolean;
        tfPath: any;
        message: string;
        error: any;
    }>;
    terraformDestroy({ name }: {
        name: any;
    }): Promise<unknown>;
    detachElasticIP(): Promise<void>;
    createTerraformFolder(): Promise<void>;
    init({ cloud }: {
        cloud: any;
    }): Promise<unknown>;
    importExistingIp({ cloud }: {
        cloud: any;
    }): Promise<unknown>;
    parseOutputs(str: any): any;
    apply({ varsObject, cloud }: {
        varsObject: any;
        cloud: any;
    }): Promise<unknown>;
}
declare const _default: {
    Terraform: typeof Terraform;
};
export default _default;
//# sourceMappingURL=terraform.d.ts.map