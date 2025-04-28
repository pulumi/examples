// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import "mocha";
import * as assert from 'assert';

pulumi.runtime.setMocks({
    newResource: function (args: pulumi.runtime.MockResourceArgs): { id: string, state: any; } {
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
    call: function (args: pulumi.runtime.MockCallArgs) {
        switch (args.token) {
            default:
                return args;
        }
    },
});

describe("BucketPair", function () {
    this.timeout(10000); // Extend the timeout for this suite

    let module: typeof import("./bucket_pair.ts");

    before(async function () {
        this.timeout(10000); // Extend timeout for the import
        // It's important to import the program _after_ the mocks are defined.
        module = await import("./bucket_pair.ts");
    });

    describe("constructor", function () {
        it("must pass bucket names", function (done) {
            const bucketPair = new module.BucketPair('my_content_bucket', 'my_logs_bucket', {});
            const outputs = [bucketPair.contentBucket.bucket, bucketPair.logsBucket.bucket];

            pulumi.all(outputs).apply(([contentBucketName, logsBucketName]) => {
                try {
                    console.log("Testing outputs:", { contentBucketName, logsBucketName });
                    assert.strictEqual(contentBucketName, 'my_content_bucket');
                    assert.strictEqual(logsBucketName, 'my_logs_bucket');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});

