const { describe, it } = require('mocha');
const { expect } = require('chai');

const { Nebula } = require('./../../lib/services/nebula');
const terraformAdapter = require('./mock-terraform-adapter');
const region = 'us-east-1';
const name = 'my-node';

let fsMock = {
    writeFile() { return Promise.resolve() },
    readFile() { return Promise.resolve() },
    deleteFile() { return Promise.resolve() },
};

describe('terraform aws adapter component tests', () => {
    it('should trigger the aws adapter if conditions are met to create a backend bucket', async () => {
        let awsAdapter = {
            config: {
                update() {

                }
            },
            S3: function () {
                return {
                    listBuckets(params, callbackFunc) {
                        console.log('called listBuckets with', params);
                        let data = {
                            Buckets: [
                                { Name: 'some-bucket' },
                                { Name: 'some-bucket-2' },
                            ]
                        };
                        callbackFunc(null, data);
                    },
                    createBucket(params, callbackFunc) {
                        console.log('create bucket called', params);
                        expect(params).to.have.keys(['Bucket', 'ACL']);
                        expect(params.Bucket).to.equal(`orbs-${region}-${name}`);

                        let data = {};

                        callbackFunc(null, data);
                    },
                    putObject(params, callbackFunc) {
                        console.log('put object called', params);
                        let data = {};
                        callbackFunc(null, data);
                    }
                };
            }
        };

        let nebula = new Nebula({ terraformAdapter, awsAdapter, fsMock });

        let cloud = {
            region,
            name,
            backend: true,
        };

        let keys = {
        };

        await nebula.createConstellation({ cloud, keys });
    });

    it('should trigger the aws adapter when a constellation is destroyed in order to clear the bucket', async () => {
        let awsAdapter = {
            deleteBucketCalled: false,
            config: {
                update() {
                }
            },
            S3: function () {
                return {
                    listBuckets(params, callbackFunc) {
                        console.log('called listBuckets with', params);
                        let data = {
                            Buckets: [
                                { Name: 'some-bucket' },
                                { Name: `orbs-${region}-${name}` },
                            ]
                        };
                        callbackFunc(null, data);
                    },
                    createBucket() {
                        throw new Error('I am not supposed to be called in this test - If you got to me - something is either wrong or design of this feature has changed!');
                    },
                    deleteObjects(params, callbackFunc) {
                        console.log('delete objects called', params);

                        expect(params).to.have.keys(['Bucket', 'Delete']);
                        expect(params.Delete).to.have.any.keys(['Objects']);
                        expect(params.Delete.Objects).to.eql([{ Key: 'terraform.tfstate' }]);

                        callbackFunc(null, {});
                    },
                    listObjectsV2(params, callbackFunc) {
                        console.log('list objects called', params);
                        expect(params).to.have.keys(['Bucket', 'MaxKeys']);
                        expect(params.Bucket).to.equal(`orbs-${region}-${name}`);
                        let data = {
                            Contents: [
                                {
                                    ETag: "70ee1738b6b21e2c8a43f3a5ab0eee71",
                                    Key: "terraform.tfstate",
                                    Size: 15,
                                    StorageClass: "STANDARD"
                                }
                            ],
                        };

                        callbackFunc(null, data);
                    },
                    deleteBucket(params, callbackFunc) {
                        awsAdapter.deleteBucketCalled = true;
                        console.log('delete bucket called', params);
                        expect(params).to.have.keys(['Bucket']);
                        expect(params.Bucket).to.equal(`orbs-${region}-${name}`);

                        let data = {};

                        callbackFunc(null, data);
                    }
                };
            }
        };

        let nebula = new Nebula({ terraformAdapter, awsAdapter, fsMock });

        let cloud = {
            region,
            name,
            backend: true,
        };

        let keys = {
        };

        await nebula.destroyConstellation({ cloud, keys });

        expect(awsAdapter.deleteBucketCalled).to.equal(true);
    });
});