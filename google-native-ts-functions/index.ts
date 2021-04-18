// Copyright 2016-2021, Pulumi Corporation.

import * as gcloud from "@pulumi/google-native";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const config = new pulumi.Config("google-native");
const project = config.require("project");
const region = config.require("region");

const randomString = new random.RandomString("name", {
    upper: false,
    number: false,
    special: false,
    length: 8,
});

const bucketName = pulumi.interpolate`bucket-${randomString.result}`;
const bucket = new gcloud.storage.v1.Bucket("bucket", {
    project: project,
    bucket: bucketName,
    name: bucketName,
});

const archiveName = "zip";
const bucketObject = new gcloud.storage.v1.BucketObject(archiveName, {
    object: archiveName,
    name: archiveName,
    bucket: bucket.name,
    source: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./pythonfunc"),
    }),
});

const functionName = pulumi.interpolate`func-${randomString.result}`;
const func = new gcloud.cloudfunctions.v1.Function("function-py", {
    projectsId: project,
    locationsId: region,
    functionsId: functionName,
    name: pulumi.interpolate`projects/${project}/locations/${region}/functions/${functionName}`,
    sourceArchiveUrl: pulumi.interpolate`gs://${bucket.name}/${bucketObject.name}`,
    httpsTrigger: {},
    entryPoint: "handler",
    timeout: "60s",
    availableMemoryMb: 128,
    runtime: "python37",
    ingressSettings: "ALLOW_ALL",
});

const invoker = new gcloud.cloudfunctions.v1.FunctionIamPolicy("function-py-iam", {
    projectsId: project,
    locationsId: region,
    functionsId: functionName, // func.name returns the long `projects/foo/locations/bat/functions/buzz` name which doesn't suit here
    bindings: [
        {
            members: ["allUsers"],
            role: "roles/cloudfunctions.invoker",
        },
    ],
}, { dependsOn: func});

export const functionUrl = func.httpsTrigger.url;
