// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

const cloud = require("@pulumi/cloud-aws");

// A bucket to store videos and thumbnails.
const bucket = new cloud.Bucket("bucket");
const bucketName = bucket.bucket.id;

// A task which runs a containerized FFMPEG job to extract a thumbnail image.
const ffmpegThumbnailTask = new cloud.Task("ffmpegThumbTask", {
    build: "./docker-ffmpeg-thumb",
    memoryReservation: 128,
});

// When a new video is uploaded, run the FFMPEG job on the video file.
bucket.onPut("onNewVideo", async (bucketArgs) => {
    console.log(`*** New video: file ${bucketArgs.key} uploaded at ${bucketArgs.eventTime}.`);
    const key = bucketArgs.key;
    
    const thumbnailFile = key.substring(0, key.indexOf('_')) + '.png';
    const framePos = key.substring(key.indexOf('_')+1, key.indexOf('.')).replace('-',':');

    return ffmpegThumbnailTask.run({
        environment: {
            "S3_BUCKET": bucketName.get(),
            "INPUT_VIDEO_FILE_NAME": key,
            "POSITION_TIME_DURATION": framePos,
            "OUTPUT_THUMBS_FILE_NAME": thumbnailFile,
        },
    }).then(() => {
        console.log(`Running thumbnailer task.`);
    });
}, { keySuffix: ".mp4" });

// When a new thumbnail is created, log a message.
bucket.onPut("onNewThumbnail", bucketArgs => {
    console.log(`A new ${bucketArgs.size}B thumbnail was saved to ${bucketArgs.key} at ${bucketArgs.eventTime}.`);
    return Promise.resolve();
}, { keySuffix: ".png" });

// Export the bucket name.
exports.bucketName = bucketName;
