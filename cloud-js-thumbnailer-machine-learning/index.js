// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

"use strict";

const cloud = require("@pulumi/cloud-aws");
const video = require("./video-label-processor");

// A bucket to store videos and thumbnails.
const bucket = new cloud.Bucket("bucket");
const bucketName = bucket.bucket.id;

// A task which runs a containerized FFMPEG job to extract a thumbnail image.
const ffmpegThumbnailTask = new cloud.Task("ffmpegThumbTask", {
    build: "./docker-ffmpeg-thumb",
    memoryReservation: 128,
});

// Use module for processing video through Rekognition
const videoProcessor = new video.VideoLabelProcessor();

// When a new video is uploaded, start Rekognition label detection
bucket.onPut("onNewVideo", async (bucketArgs) => {  
    console.log(`*** New video: file ${bucketArgs.key} was uploaded at ${bucketArgs.eventTime}.`);
    videoProcessor.startRekognitionJob(bucketName.get(), bucketArgs.key);
}, { keySuffix: ".mp4" });  // run this Lambda only on .mp4 files

// When Rekognition processing is complete, run the FFMPEG task on the video file
// Use the timestamp with the highest confidence for the label "cat"
videoProcessor.onLabelResult("cat", async (file, framePos) => {
    console.log(`*** Rekognition processing complete for ${bucketName.get()}/${file} at timestamp ${framePos}`);
    const thumbnailFile = file.substring(0, file.lastIndexOf('.')) + '.jpg';

    // launch ffmpeg in a container, use environment variables to connect resources together
    await ffmpegThumbnailTask.run({
        environment: {
            "S3_BUCKET":   bucketName.get(),
            "INPUT_VIDEO": file,
            "TIME_OFFSET": framePos,
            "OUTPUT_FILE": thumbnailFile,
        },
    });
    console.log("*** Launched thumbnailer task.");
});

// When a new thumbnail is created, log a message.
bucket.onPut("onNewThumbnail", async (bucketArgs) => {
    console.log(`*** New thumbnail: file ${bucketArgs.key} was saved at ${bucketArgs.eventTime}.`);
}, { keySuffix: ".jpg" });

// Export the bucket name.
exports.bucketName = bucketName;
