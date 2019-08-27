// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import { asset } from "@pulumi/pulumi";

const bucket = new gcp.storage.Bucket("bucket");

// Google Cloud Function in Python

const bucketObjectPython = new gcp.storage.BucketObject("python-zip", {
    bucket: bucket.name,
    source: new asset.AssetArchive({
        ".": new asset.FileArchive("./pythonfunc"),
    }),
});

const functionPython = new gcp.cloudfunctions.Function("python-func", {
    sourceArchiveBucket: bucket.name,
    runtime: "python37",
    sourceArchiveObject: bucketObjectPython.name,
    entryPoint: "handler",
    triggerHttp: true,
    availableMemoryMb: 128,
});

export const pythonEndpoint = functionPython.httpsTriggerUrl;

// Google Cloud Function in Go

const bucketObjectGo = new gcp.storage.BucketObject("go-zip", {
    bucket: bucket.name,
    source: new asset.AssetArchive({
        ".": new asset.FileArchive("./gofunc"),
    }),
});

const functionGo = new gcp.cloudfunctions.Function("go-func", {
    sourceArchiveBucket: bucket.name,
    runtime: "go111",
    sourceArchiveObject: bucketObjectGo.name,
    entryPoint: "Handler",
    triggerHttp: true,
    availableMemoryMb: 128,
});

export const goEndpoint = functionGo.httpsTriggerUrl;
