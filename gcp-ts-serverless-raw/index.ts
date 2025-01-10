// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import { asset } from "@pulumi/pulumi";

const bucket = new gcp.storage.Bucket("bucket", {
    location: "US",
});

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

const pyInvoker = new gcp.cloudfunctions.FunctionIamMember("py-invoker", {
    project: functionPython.project,
    region: functionPython.region,
    cloudFunction: functionPython.name,
    role: "roles/cloudfunctions.invoker",
    member: "allUsers",
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
    runtime: "go120",
    sourceArchiveObject: bucketObjectGo.name,
    entryPoint: "Handler",
    triggerHttp: true,
    availableMemoryMb: 128,
});

const goInvoker = new gcp.cloudfunctions.FunctionIamMember("go-invoker", {
    project: functionGo.project,
    region: functionGo.region,
    cloudFunction: functionGo.name,
    role: "roles/cloudfunctions.invoker",
    member: "allUsers",
});

export const goEndpoint = functionGo.httpsTriggerUrl;

// Google Cloud Function in TypeScript

const tsBucketObject = new gcp.storage.BucketObject("ts-zip", {
    bucket: bucket.name,
    source: new asset.AssetArchive({
      ".": new asset.FileArchive("./typescriptfunc"),
    }),
});

const tsFunction = new gcp.cloudfunctions.Function("ts-func", {
    sourceArchiveBucket: bucket.name,
    runtime: "nodejs16",
    sourceArchiveObject: tsBucketObject.name,
    entryPoint: "handler",
    triggerHttp: true,
    availableMemoryMb: 128,
});

const tsInvoker = new gcp.cloudfunctions.FunctionIamMember("ts-invoker", {
    project: tsFunction.project,
    region: tsFunction.region,
    cloudFunction: tsFunction.name,
    role: "roles/cloudfunctions.invoker",
    member: "allUsers",
});

export const tsEndpoint = tsFunction.httpsTriggerUrl;
