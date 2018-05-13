// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

const cloud = require("@pulumi/cloud-aws");

// A task which runs a containerized FFMPEG job to extract a thumbnail image.
const ffmpegThumbnailTask = new cloud.Task("ffmpegThumbTask", {
    build: "./docker-ffmpeg-thumb",
    memoryReservation: 128,
});

// A bucket to store videos and thumbnails.
const bucket = new cloud.Bucket("bucket");
const bucketName = bucket.bucket.id;

// object to search for
const searchObject = "cat";

const topic = new cloud.Topic("AmazonRekognitionTopic");

topic.subscribe("labelResults", (jobStatus) => {
    if (jobStatus.Status == 'SUCCEEDED' && jobStatus.API == 'StartLabelDetection') {
        var aws = require('aws-sdk');
        var rekognition = new aws.Rekognition();

        rekognition.getLabelDetection( { JobId: jobStatus.JobId }, 
            function (err, data) {
                if (!err) {
                    let timestamp = getTimestampForLabel(data.Labels, searchObject);
                    return extractKeyFrame(jobStatus.Video.S3Bucket, jobStatus.Video.S3ObjectName, timestamp);
                }
                else console.log(err, err.stack); 
            }
        );

        Promise.resolve();
    }
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
        console.log(`Started thumbnailer task! ${bucketName}/${filename} at timestamp ${timestamp}`);
    });
}

function getTimestampForLabel(labels, filterName) {
    let bestTimestamp = 0;
    let highestConfidence = 0;

    labels.forEach(element => {
        if (element.Label.Name.toLowerCase() == filterName.toLowerCase() && 
            element.Label.Confidence > highestConfidence) {
            highestConfidence = element.Label.Confidence;
            bestTimestamp = element.Timestamp;
        }
    });
    
    return bestTimestamp / 1000; // convert to milliseconds
}

// When a new video is uploaded, run the FFMPEG job on the video file.
bucket.onPut("onNewVideo", async (bucketArgs) => {
    var aws = require('aws-sdk');
    var rekognition = new aws.Rekognition();

    console.log(`A new ${bucketArgs.size}B video was uploaded to ${bucketArgs.key} at ${bucketArgs.eventTime}.`);

    const filename = bucketArgs.key;

    var params = {
        Video: { 
            S3Object: {
                Bucket: bucketName.get(),
                Name: filename,
            }
        },
        NotificationChannel: {
            RoleArn: "arn:aws:iam::153052954103:role/donna-rekognition", // TODO: replace with programmatically defined role
            SNSTopicArn: topic.topic.arn.get()
        }
    };

    rekognition.startLabelDetection(params, (err, data) => {
        if (!err) {
            console.log(`Job submitted! Response: ${JSON.stringify(data)}`);
        }
        else console.log(err, err.stack);        
    });
}, { keySuffix: ".mp4" });

// When a new thumbnail is created, log a message.
bucket.onPut("onNewThumbnail", async (bucketArgs) => {
    console.log(`A new ${bucketArgs.size}B thumbnail was saved to ${bucketArgs.key} at ${bucketArgs.eventTime}.`);
}, { keySuffix: ".png" });

// Export the bucket name.
exports.bucketName = bucketName;
exports.topicArn = topic.topic.arn;