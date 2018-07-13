// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

const cloud = require("@pulumi/cloud-aws");

// A bucket to store videos and thumbnails.
const bucket = new cloud.Bucket("bucket");
const bucketName = bucket.bucket.id;

// A task which runs a containerized FFMPEG job to extract a thumbnail image.
const ffmpegThumbnailTask = new cloud.Task("ffmpegThumbTask", {
    build: "./docker-ffmpeg-thumb",
    memoryReservation: 512,
});

// When a new video is uploaded, run the FFMPEG task on the video file.
// Use the time index specified in the filename (e.g. cat_00-01.mp4 uses timestamp 00:01)
bucket.onPut("onNewVideo", bucketArgs => {
    console.log(`*** New video: file ${bucketArgs.key} was uploaded at ${bucketArgs.eventTime}.`);
    const file = bucketArgs.key;
    
    const thumbnailFile = file.substring(0, file.indexOf('_')) + '.jpg';
    const framePos = file.substring(file.indexOf('_')+1, file.indexOf('.')).replace('-',':');

    ffmpegThumbnailTask.run({
        environment: {
            "S3_BUCKET":   bucketName.get(),
            "INPUT_VIDEO": file,
            "TIME_OFFSET": framePos,
            "OUTPUT_FILE": thumbnailFile,
        },
    }).then(() => {
        console.log(`Running thumbnailer task.`);
    });
}, { keySuffix: ".mp4" });

// When a new thumbnail is created, log a message.
bucket.onPut("onNewThumbnail", bucketArgs => {
    console.log(`*** New thumbnail: file ${bucketArgs.key} was saved at ${bucketArgs.eventTime}.`);
    return Promise.resolve();
}, { keySuffix: ".jpg" });

// Export the bucket name.
exports.bucketName = bucketName;
