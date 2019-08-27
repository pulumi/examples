// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// A simple cluster to run our tasks in.
const cluster = awsx.ecs.Cluster.getDefault();

// A bucket to store videos and thumbnails.
const bucket = new aws.s3.Bucket("bucket");

// Export the bucket name.
export const bucketName = bucket.id;

// A task which runs a containerized FFMPEG job to extract a thumbnail image.
const ffmpegThumbnailTask = new awsx.ecs.FargateTaskDefinition("ffmpegThumbTask", {
    container: {
        image: awsx.ecs.Image.fromPath("ffmpegThumbTask", "./docker-ffmpeg-thumb"),
        memoryReservation: 512,
    },
});

// When a new video is uploaded, run the FFMPEG task on the video file.
// Use the time index specified in the filename (e.g. cat_00-01.mp4 uses timestamp 00:01)
bucket.onObjectCreated("onNewVideo", new aws.lambda.CallbackFunction<aws.s3.BucketEvent, void>("onNewVideo", {
    // Specify appropriate policies so that this AWS lambda can run EC2 tasks.
    policies: [
        aws.iam.AWSLambdaFullAccess,                 // Provides wide access to "serverless" services (Dynamo, S3, etc.)
        aws.iam.AmazonEC2ContainerServiceFullAccess, // Required for lambda compute to be able to run Tasks
    ],
    callback: async bucketArgs => {
        console.log("onNewVideo called");
        if (!bucketArgs.Records) {
            return;
        }

        for (const record of bucketArgs.Records) {
            console.log(`*** New video: file ${record.s3.object.key} was uploaded at ${record.eventTime}.`);
            const file = record.s3.object.key;

            const thumbnailFile = file.substring(0, file.indexOf("_")) + ".jpg";
            const framePos = file.substring(file.indexOf("_")+1, file.indexOf(".")).replace("-", ":");

            await ffmpegThumbnailTask.run({
                cluster,
                overrides: {
                    containerOverrides: [{
                        name: "container",
                        environment: [
                            { name: "S3_BUCKET", value: bucketName.get() },
                            { name: "INPUT_VIDEO", value: file },
                            { name: "TIME_OFFSET", value: framePos },
                            { name: "OUTPUT_FILE", value: thumbnailFile },
                        ],
                    }],
                },
            });

            console.log(`Running thumbnailer task.`);
        }
    },
}), { filterSuffix: ".mp4" });

// When a new thumbnail is created, log a message.
bucket.onObjectCreated("onNewThumbnail", async bucketArgs => {
    console.log("onNewThumbnail called");
    if (!bucketArgs.Records) {
        return;
    }

    for (const record of bucketArgs.Records) {
        console.log(`*** New thumbnail: file ${record.s3.object.key} was saved at ${record.eventTime}.`);
    }
}, { filterSuffix: ".jpg" });
