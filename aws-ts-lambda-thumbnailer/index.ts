// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// A bucket to store videos and thumbnails.
const bucket = new aws.s3.Bucket("bucket");

const image = awsx.ecr.buildAndPushImage("sampleapp", {
    context: "./docker-ffmpeg-thumb",
});
const role = new aws.iam.Role("thumbnailerRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
});
new aws.iam.RolePolicyAttachment("lambdaFullAccess", {
    role: role.name,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaFullAccess
});

const thumbnailer = new aws.lambda.Function("thumbnailer", {
    packageType: "Image",
    imageUri: image.imageValue,
    role: role.arn,
    timeout: 60,
});

// When a new video is uploaded, run the FFMPEG task on the video file.
// Use the time index specified in the filename (e.g. cat_00-01.mp4 uses timestamp 00:01)
bucket.onObjectCreated("onNewVideo", thumbnailer, { filterSuffix: ".mp4" });

// Export the bucket name.
export const bucketName = bucket.id;

// When a new thumbnail is created, log a message.
bucket.onObjectCreated("onNewThumbnail", new aws.lambda.CallbackFunction<aws.s3.BucketEvent, void>("onNewThumbnail", {
    callback: async bucketArgs => {
        console.log("onNewThumbnail called");
        if (!bucketArgs.Records) {
            return;
        }

        for (const record of bucketArgs.Records) {
            console.log(`*** New thumbnail: file ${record.s3.object.key} was saved at ${record.eventTime}.`);
        }
    },
    policies: [
        aws.iam.ManagedPolicies.AWSLambdaFullAccess,                 // Provides wide access to "serverless" services (Dynamo, S3, etc.)
    ],
}), { filterSuffix: ".jpg" });
