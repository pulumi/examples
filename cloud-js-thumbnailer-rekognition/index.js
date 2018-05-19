"use strict";

const cloud = require("@pulumi/cloud-aws");

const video = require("./video-label-processor");

const bucket = new cloud.Bucket("bucket");
const bucketName = bucket.bucket.id;

const ffmpegThumbnailTask = new cloud.Task("ffmpegThumbTask", {
    build: "./docker-ffmpeg-thumb",
    memoryReservation: 128,
});

// Use a module for processing video through Rekognition 
// The module creates an SNS topic
const videoProcessor = new video.VideoLabelProcessor();

/// When a new video is uploaded, run Rekognition using videoProcessor
bucket.onPut("onNewVideo", async (bucketArgs) => {  
    console.log(`*** New video: file ${bucketArgs.key} was uploaded at ${bucketArgs.eventTime}.`);
    videoProcessor.startRekognitionJob(bucketName.get(), bucketArgs.key);
}, { keySuffix: ".mp4" });  // run this Lambda only on .mp4 files

videoProcessor.onLabelResult("cat", (filename, timestamp) => {
    const outputFilename = filename.substring(0, filename.lastIndexOf('.')) + '.jpg';

    // launch ffmpeg in a container, use environment variables to connect resources together
    return ffmpegThumbnailTask.run({
        environment: {
            "S3_BUCKET": bucketName.get(),      // Can easily reference bucketName defined above
            "INPUT_VIDEO_FILE_NAME": filename,
            "POSITION_TIME_DURATION": timestamp,
            "OUTPUT_THUMBS_FILE_NAME": outputFilename
        },
    }).then(() => {
        console.log(`*** Launched thumbnailer task for ${bucketName}/${filename} at timestamp ${timestamp}`);
    });
});

bucket.onPut("onNewThumbnail", async (bucketArgs) => {
    console.log(`*** New thumbnail: Saved file ${bucketArgs.key} at ${bucketArgs.eventTime}.`);
}, { keySuffix: ".jpg" });

// Export the bucket name.
exports.bucketName = bucketName;
