/**
 * Main facade for the public Nebula API
 */

const uuid = require('uuid/v1');
const AWS = require('aws-sdk');
const fs = require('fs');
const util = require('util');
const path = require('path');

let writeFile;
let readFile;
let deleteFile;

const boyarDefaultVersion = 'v1.1.1';

function validateBoyarUrl(cloud) {
    // Boyar tarball URL hard-coded defaults

    if (!cloud.boyarTargetUrl) {
        cloud.boyarTargetUrl = `https://s3.amazonaws.com/orbs-network-releases/infrastructure/boyar/boyar-${boyarDefaultVersion}.bin`;
    }
}

class Nebula {
    constructor({ terraformAdapter = null, awsAdapter = AWS, fsMock = false }) {
        if (!terraformAdapter) {
            throw new Error('No Terraform adapter provided!');
        }
        this.terraform = terraformAdapter;
        this.aws = awsAdapter;

        // Create file system handlers
        if (fsMock !== false) {
            writeFile = fsMock.writeFile;
            readFile = fsMock.readFile;
            deleteFile = fsMock.deleteFile;
        } else {
            writeFile = util.promisify(fs.writeFile);
            readFile = util.promisify(fs.readFile);
            deleteFile = util.promisify(fs.unlink);
        }
    }

    setTerraformCachePath(cachePath) {
        this.terraform.setCachePath(cachePath);
    }

    createTerraformStateStorageBucket({ region, name }) {
        let s3 = new this.aws.S3({ apiVersion: '2006-03-01', region });

        return new Promise((resolve, reject) => {
            let Bucket = this.getTerraformStateStoragePreparedBucketName({ region, name });
            console.log('attempting to create bucket', Bucket);

            let params = {
                Bucket,
                ACL: 'public-read',
            };

            if (region !== 'us-east-1') {
                params.CreateBucketConfiguration = {
                    LocationConstraint: region
                };
            }

            s3.createBucket(params, (err, data) => {
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

        let s3 = new this.aws.S3({ apiVersion: '2006-03-01', region });

        return new Promise((resolve, reject) => {

            s3.listBuckets({}, (err, data) => {
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

    async restoreEFSIdFromStateBucket({ region, name }) {
        const Bucket = this.getTerraformStateStoragePreparedBucketName({ region, name });

        let s3 = new this.aws.S3({ apiVersion: '2006-03-01', region });

        const result = await s3
            .getObject({
                Bucket,
                Key: 'storage/.efs',
            })
            .promise();

        return result.Body.toString(); // -> efsId
    }

    saveEFSIdIntoStateBucket({ region, name, efsId }) {
        const Bucket = this.getTerraformStateStoragePreparedBucketName({ region, name });
        let s3 = new this.aws.S3({ apiVersion: '2006-03-01', region });

        return new Promise((resolve, reject) => {
            s3.putObject({
                Bucket,
                Key: 'storage/.efs',
                Body: efsId,
                ACL: 'public-read'
            }, function (err) {
                if (err) { reject({ err }); }
                resolve({ ok: true });
            });
        });
    }

    getTerraformStateStoragePreparedBucketName({ region, name }) {
        return `orbs-${region}-${name}`;
    }

    getStateStorageBucketItems({ Bucket, region }) {
        let s3 = new this.aws.S3({ apiVersion: '2006-03-01', region });

        return new Promise((resolve, reject) => {
            let params = {
                Bucket,
                MaxKeys: 500
            };

            s3.listObjectsV2(params, function (err, data) {
                if (err) {
                    //console.log(err, err.stack); // an error occurred
                    reject(err);
                } else {
                    // console.log('bucket contents:', data);
                    resolve(data);
                }
            });
        });
    }

    async deleteAllItemsFromStateStorageBucket({ Bucket, region }) {
        const objects = await this.getStateStorageBucketItems({ Bucket, region });
        const Objects = objects.Contents.map(({ Key }) => ({ Key }));
        await this.deleteObjectsFromBucket({ Bucket, Objects, region });
    }

    deleteObjectsFromBucket({ Bucket, Objects, region }) {
        let s3 = new this.aws.S3({ apiVersion: '2006-03-01', region });

        return new Promise((resolve, reject) => {
            let params = {
                Bucket,
                Delete: {
                    Objects,
                    Quiet: false
                }
            };

            s3.deleteObjects(params, function (err, data) {
                if (err) {
                    // console.log(err, err.stack); // an error occurred
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async terraformStateStorageDeleteBucket({ region, name }) {
        const Bucket = this.getTerraformStateStoragePreparedBucketName({ region, name });
        await this.deleteAllItemsFromStateStorageBucket({ Bucket, region });

        let s3 = new this.aws.S3({ apiVersion: '2006-03-01', region });

        return new Promise((resolve, reject) => {
            var params = { Bucket };

            s3.deleteBucket(params, function (err, data) {
                if (err) {
                    //console.log(err, err.stack); // an error occurred
                    reject(err);
                    return;
                }

                // Bucket was deleted successfully if we got here.
                resolve(data);
            });
        })
    }

    getWorkspacePath(name) {
        return path.join(this.terraform.getCachePath(), name);
    }

    async createConstellation({ cloud = {}, keys = {}, }) {
        const eip = 'ip' in cloud;

        if (!cloud.name) { // If there is no name , assign an annonymous name to the node
            cloud.name = uuid().substr(0, 30);
        }

        if (cloud.name.length > 55) {
            throw new Error('Constellation name is limited to 55 characters');
        }

        const workspacePath = this.getWorkspacePath(cloud.name);
        const successSnapshot = await this.successSnapshotExists({ workspacePath });
        if (successSnapshot !== false) {
            return successSnapshot;
        }

        validateBoyarUrl(cloud);

        if (cloud.backend === true) {
            let params = { region: cloud.region, name: cloud.name };
            try {
                await this.terraformStateStorageBucketExists(params);
                // After the bucket thing is settled, we should workout if an EFS exists for this node.

                const efsId = await this.restoreEFSIdFromStateBucket(params);
                // Enrich the cloud object with the efsId

                console.log('getting efs id from here', efsId);
                cloud.efsId = efsId;
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
            console.log('Could not create infrastructure using Terraform (log inline)');
            throw result.error;
        }

        const { outputs } = result;

        if (cloud.backend === true) {
            const efsId = outputs[outputs.findIndex(o => o.key === 'block_storage')].value;
            await this.saveEFSIdIntoStateBucket({ region: cloud.region, name: cloud.name, efsId });
        }

        const swarmmanagerPublicIp = (eip) ? cloud.ip :
            outputs.find(o => o.key === 'manager_ip').value;

        const nebulaResult = {
            tfPath: result.tfPath,
            name: cloud.name,
            manager: {
                ip: swarmmanagerPublicIp,
            },
        };

        await this.storeSuccessSnapshot({ result: nebulaResult, workspacePath });
        return nebulaResult;
    }

    async successSnapshotExists({ workspacePath }) {
        const targetPath = path.join(workspacePath, 'success.json');
        if (fs.existsSync(targetPath)) {
            return JSON.parse(await readFile(targetPath, 'utf-8'));
        }
        return false;
    }

    async storeSuccessSnapshot({ result, workspacePath }) {
        await writeFile(path.join(workspacePath, 'success.json'), JSON.stringify(result));
        await deleteFile(path.join(workspacePath, 'destroy.json')).catch(() => { });
    }

    async destroySnapshotExists({ workspacePath }) {
        const targetPath = path.join(workspacePath, 'destroy.json');
        if (fs.existsSync(targetPath)) {
            return JSON.parse(await readFile(targetPath, 'utf-8'));
        }
        return false;
    }

    async storeDestroySnapshot({ result, workspacePath }) {
        await writeFile(path.join(workspacePath, 'destroy.json'), JSON.stringify(result));
        await deleteFile(path.join(workspacePath, 'success.json')).catch(() => { });
    }

    async destroyConstellation({ cloud, keys }) {
        if (!cloud.name) {
            console.log('Could not destroy constellation with the supplied name!', cloud.name);
            return result;
        }

        const workspacePath = this.getWorkspacePath(cloud.name);
        const destroySnapshot = await this.destroySnapshotExists({ workspacePath });
        if (destroySnapshot !== false) {
            return destroySnapshot;
        }

        let destroyBucket = false;
        let params = {
            region: cloud.region,
            name: cloud.name,
        };

        validateBoyarUrl(cloud);

        if (cloud.backend) {
            try {
                await this.terraformStateStorageBucketExists(params);
                destroyBucket = true;
                const efsId = await this.restoreEFSIdFromStateBucket(params);
                // Enrich the cloud object with the efsId

                cloud.efsId = efsId;
            } catch (err) {
                // Swallow the error on purpose.
            }
        }

        const result = await this.terraform.destroy({ cloud, keys });

        if (cloud.backend && destroyBucket) {
            try {
                await this.terraformStateStorageDeleteBucket(params);
            } catch (err) {
                console.log('State bucket failed to destroy', err);
            }
        }

        const nebulaResult = {
            ok: true,
            error: null,
        };

        await this.storeDestroySnapshot({ result: nebulaResult, workspacePath });

        return nebulaResult;
    }
}

module.exports = {
    Nebula,
    validateBoyarUrl,
    boyarDefaultVersion,
};
