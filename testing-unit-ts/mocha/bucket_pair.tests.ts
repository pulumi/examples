// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import "mocha";
import * as assert from 'assert';
import "./mocks";

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
                assert.strictEqual(contentBucketName, 'my_content_bucket');
                assert.strictEqual(logsBucketName, 'my_logs_bucket');
                done();
            });
        });
    });
});
