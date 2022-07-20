// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import "mocha";
import * as assert from 'assert';

pulumi.runtime.setMocks({
    newResource: function(args: pulumi.runtime.MockResourceArgs): {id: string, state: any} {
        switch (args.type) {
            default:
                return {
                    id: args.inputs.name + "_id",
                    state: {
                        ...args.inputs,
                    },
                };
        }
    },
    call: function(args: pulumi.runtime.MockCallArgs) {
        switch (args.token) {
            default:
                return args;
        }
    },
});

describe("BucketPair", function() {
    let module: typeof import("./bucket_pair");

    before(async function() {
        // It's important to import the program _after_ the mocks are defined.
        module = await import("./bucket_pair");
    });

    describe("constructor", function() {
        it("must pass bucket names", function(done) {
            const bucketPair = new module.BucketPair('my_content_bucket', 'my_logs_bucket', {});
            const outputs = [bucketPair.contentBucket.bucket, bucketPair.logsBucket.bucket];
            pulumi.all(outputs).apply(([contentBucketName, logsBucketName]) => {
                try
                {
                    /*
                    * If you don't have the try/catch in here, if the assert fails it'll just timeout
                    * If you have the try/catch, the "done()" in the catch block will get hit and it won't time out (async fun)
                    */
                    assert.strictEqual(contentBucketName, 'my_content_bucket');
                    assert.strictEqual(logsBucketName, 'my_logs_bucket');
                    done();
                } catch(e) {
                    done(e);
                }
            });
        });
    });
});
