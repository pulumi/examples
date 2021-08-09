// Copyright 2016-2021, Pulumi Corporation.

import * as gcloud from "@pulumi/google-native";
import * as pulumi from "@pulumi/pulumi";

const bucket = new gcloud.storage.v1.Bucket("bucket");

const bucketObject = new gcloud.storage.v1.BucketObject("zip", {
    bucket: bucket.name,
    source: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./pythonfunc"),
    }),
});

const func = new gcloud.cloudfunctions.v1.Function("function-py", {
    sourceArchiveUrl: pulumi.interpolate`gs://${bucket.name}/${bucketObject.name}`,
    httpsTrigger: {},
    entryPoint: "handler",
    timeout: "60s",
    availableMemoryMb: 128,
    runtime: "python37",
    ingressSettings: "ALLOW_ALL",
});

const invoker = new gcloud.cloudfunctions.v1.FunctionIamPolicy("function-py-iam", {
    functionId: func.name.apply(name => name.split("/")[name.split("/").length-1]),
    bindings: [
        {
            members: ["allUsers"],
            role: "roles/cloudfunctions.invoker",
        },
    ],
}, { dependsOn: func});

export const functionUrl = func.httpsTrigger.url;
