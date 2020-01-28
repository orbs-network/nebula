/**
 * Main facade for the public Nebula API
 */
const path = require('path');
const uuid = require('uuid/v1');
const AWS = require('aws-sdk');

const { Terraform } = require('./terraform');

const defaultTerraformAdapter = new Terraform();
defaultTerraformAdapter.setCachePath(path.join(process.cwd(), '_terraform'));

class Nebula {
    constructor({ terraformAdapter = defaultTerraformAdapter, awsAdapter = AWS }) {
        this.terraform = terraformAdapter;
        this.aws = awsAdapter;

        this.s3 = new this.aws.S3({ apiVersion: '2006-03-01' });
    }

    setTerraformCachePath(cachePath) {
        this.terraform.setCachePath(cachePath);
    }

    createTerraformStateStorageBucket({ region, name }) {
        this.aws.config.update({ region });

        return new Promise((resolve, reject) => {
            let Bucket = this.getTerraformStateStoragePreparedBucketName({ region, name });

            let params = {
                Bucket,
                ACL: 'public-read',
            };

            if (region !== 'us-east-1') {
                params.CreateBucketConfiguration = {
                    LocationConstraint: region
                };
            }

            this.s3.createBucket(params, (err, data) => {
                if (!err) {
                    console.log('the state bucket has been created!', data);
                    resolve(data);
                } else {
                    console.log(err);
                    reject(err);
                }
            });
        });
    }

    terraformStateStorageBucketExists({ region, name }) {
        const searchForBucketName = this.getTerraformStateStoragePreparedBucketName({ region, name });
        this.aws.config.update({ region });

        return new Promise((resolve, reject) => {
            this.s3.listBuckets({}, (err, data) => {
                if (!err) {
                    for (let n in data.Buckets) {
                        if (data.Buckets[n].Name === searchForBucketName) {
                            console.log('the bucket state exists!', data.Buckets[n]);
                            resolve(searchForBucketName);
                            return;
                        }
                    }
                }

                reject(new Error('No state bucket found'));
            });
        });
    }

    getTerraformStateStoragePreparedBucketName({ region, name }) {
        return `orbs-${region}-${name}`;
    }

    getStateStorageBucketItems({ Bucket }) {
        return new Promise((resolve, reject) => {
            let params = {
                Bucket,
                MaxKeys: 500
            };

            this.s3.listObjectsV2(params, function (err, data) {
                if (err) {
                    console.log(err, err.stack); // an error occurred
                    reject(err);
                } else {
                    console.log('bucket contents:', data);
                    resolve(data);
                }
            });
        });
    }

    async deleteAllItemsFromStateStorageBucket({ Bucket }) {
        const objects = await this.getStateStorageBucketItems({ Bucket });
        const Objects = objects.Contents.map(({ Key }) => ({ Key }));
        await this.deleteObjectsFromBucket({ Bucket, Objects });
    }

    deleteObjectsFromBucket({ Bucket, Objects }) {
        return new Promise((resolve, reject) => {
            let params = {
                Bucket,
                Delete: {
                    Objects,
                    Quiet: false
                }
            };

            this.s3.deleteObjects(params, function (err, data) {
                if (err) {
                    console.log(err, err.stack); // an error occurred
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async terraformStateStorageDeleteBucket({ region, name }) {
        const Bucket = this.getTerraformStateStoragePreparedBucketName({ region, name });
        await this.deleteAllItemsFromStateStorageBucket({ Bucket });

        return new Promise((resolve, reject) => {
            var params = { Bucket };

            this.s3.deleteBucket(params, function (err, data) {
                if (err) {
                    console.log(err, err.stack); // an error occurred
                    reject(err);
                    return;
                }

                // Bucket was deleted successfully if we got here.
                resolve(data);
            });
        })
    }

    async createConstellation({ cloud = {}, keys = {}, }) {
        const eip = 'ip' in cloud;

        if (!cloud.name) { // If there is no name , assign an annonymous name to the node
            cloud.name = uuid().substr(0, 30);
        }

        if (cloud.name.length > 55) {
            return {
                ok: false,
                error: 'Constellation name is limited to 55 characters',
                tfPath: false,
            };
        }

        if (cloud.backend === true) {
            let params = { region: cloud.region, name: cloud.name };
            try {
                await this.terraformStateStorageBucketExists(params);
            } catch (err) {
                if (err.message === 'No state bucket found') {
                    console.log('error message correct');
                }
                await this.createTerraformStateStorageBucket(params);
            }
        }

        const result = await this.terraform.create({
            cloud,
            keys,
        });

        if (!result.ok) {
            console.log('');
            console.log('Could not create infrastructure using Terraform (log inline)');
            console.log(result.error);
            return result;
        }

        const { outputs } = result;

        const swarmmanagerPublicIp = (eip) ? cloud.ip :
            outputs.find(o => o.key === 'manager_ip').value;

        return {
            ok: true,
            tfPath: result.tfPath,
            name: cloud.name,
            manager: {
                ip: swarmmanagerPublicIp,
            },
        };
    }

    async destroyConstellation({ cloud, keys }) {
        if (!cloud.name) {
            console.log('Could not destroy constellation with the supplied name!', cloud.name);
            return result;
        }

        const result = await this.terraform.destroy({ cloud, keys });

        if (cloud.backend) {
            let params = {
                region: cloud.region,
                name: cloud.name,
            };

            try {
                await this.terraformStateStorageBucketExists(params);
                // If we pass this line without throwing an error
                // We can safely assert from that the bucket exists and we should destroy it.
                // To keep the validator's AWS account sparkly clean!

                await this.terraformStateStorageDeleteBucket(params);
            } catch (err) {
                console.log('No terraform state bucket, skipping destruction of it.', err);
            }
        }

        return {
            ok: true,
            error: null,
        };
    }
}

module.exports = {
    Nebula,
};
