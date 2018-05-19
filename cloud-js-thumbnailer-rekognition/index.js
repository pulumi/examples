"use strict";

const cloud = require("@pulumi/cloud-aws");
const pulumi = require("@pulumi/pulumi");

const config = new pulumi.Config("video-thumbnailer-rekognition");

// A task which runs a containerized FFMPEG job to extract a thumbnail image.
const ffmpegThumbnailTask = new cloud.Task("ffmpegThumbTask", {
    build: "./docker-ffmpeg-thumb",
    memoryReservation: 128,
});

// A bucket to store videos and thumbnails.
const bucket = new cloud.Bucket("bucket");
const bucketName = bucket.bucket.id;

const topic = new cloud.Topic("AmazonRekognitionTopic");

topic.subscribe("labelResults", (jobStatus) => {
    let rekognition = require("./rekognition");
    
    rekognition.processResults(jobStatus, (data) => {
        let searchObject = "cat";
        let timestamp = rekognition.getTimestampForLabel(data.Labels, searchObject);
        return extractKeyFrame(jobStatus.Video.S3Bucket, jobStatus.Video.S3ObjectName, timestamp);
    });
});

function extractKeyFrame(bucketName, filename, timestamp) {
    let outputFilename = filename.substring(0, filename.lastIndexOf('.')) + '.png';

    return ffmpegThumbnailTask.run({
        environment: {
            "S3_BUCKET": bucketName,
            "INPUT_VIDEO_FILE_NAME": filename,
            "POSITION_TIME_DURATION": timestamp.toString(),
            "OUTPUT_THUMBS_FILE_NAME": outputFilename
        },
    }).then(() => {
        console.log(`*** Launched thumbnailer task for ${bucketName}/${filename} at timestamp ${timestamp}`);
    });
}

const roleArn = config.require("RekognitionRoleArn");


// When a new video is uploaded, run the FFMPEG job on the video file.
bucket.onPut("onNewVideo", async (bucketArgs) => {

    console.log(`*** New video: file ${bucketArgs.key} was uploaded at ${bucketArgs.eventTime}.`);

    // const framePos = filename.substring(filename.indexOf('_')+1, filename.indexOf('.')).replace('-',':');
    let rekognition = require("./rekognition");
    rekognition.startRekognitionJob(bucketName.get(), bucketArgs.key, roleArn, topic.topic.arn.get());

}, { keySuffix: ".mp4" });


// When a new thumbnail is created, log a message.
bucket.onPut("onNewThumbnail", async (bucketArgs) => {

    console.log(`*** New thumbnail: Saved file ${bucketArgs.key} at ${bucketArgs.eventTime}.`);
}, { keySuffix: ".png" });



// Export the bucket name.
exports.bucketName = bucketName;
exports.topicArn = topic.topic.arn;
