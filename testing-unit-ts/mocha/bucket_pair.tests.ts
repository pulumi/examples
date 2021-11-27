// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import { strict as assert } from "assert";
import "mocha";
import "./mocks";
import { unwrap } from "./unwrap";

describe("BucketPair", function() {
    let module: typeof import("./bucket_pair");

    before(async function() {
        // It's important to import the program _after_ the mocks are defined.
        module = await import("./bucket_pair");
    });

    describe("constructor", function() {
        it("must pass bucket names", async function() {
            const bucketPair = new module.BucketPair("my_content_bucket", "my_logs_bucket", {});
            const [contentBucketName, logsBucketName] = await unwrap([bucketPair.contentBucket.bucket, bucketPair.logsBucket.bucket]);
            assert.strictEqual(contentBucketName, "my_content_bucket");
            assert.strictEqual(logsBucketName, "my_logs_bucket");
        });
    });
});
