// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

"use strict";

const cloud = require("@pulumi/cloud-aws");
const aws = require("@pulumi/aws");

class VideoLabelProcessor {
    constructor() {
        let topic = new cloud.Topic("AmazonRekognitionTopic");
        let role = createRekognitionRole();

        this.startRekognitionJob = (bucketName, filename) => {
            var aws = require("aws-sdk");
            var rekognition = new aws.Rekognition();
            var params = {
                Video: { 
                    S3Object: {
                        Bucket: bucketName,
                        Name: filename,
                    }
                },
                NotificationChannel: {
                    RoleArn: role.arn.get(),
                    SNSTopicArn: topic.topic.arn.get(),
                }
            };

            rekognition.startLabelDetection(params, (err, data) => {
                if (!err) {
                    console.log(`*** Submitted Rekognition job for ${filename}`);
                } else {
                    console.log(err, err.stack);
                }
            });
        }

        this.onLabelResult = (searchLabel, action) => {
            topic.subscribe("labelResults", (jobStatus) => {
                console.log("*** Rekognition job complete");

                if (jobStatus.Status == "SUCCEEDED" && jobStatus.API == "StartLabelDetection") {
                    var aws = require("aws-sdk");
                    var rekognition = new aws.Rekognition();
                    rekognition.getLabelDetection( { JobId: jobStatus.JobId },
                        function (err, data) {
                            if (!err) {
                                // call callback to process the video at a timestamp
                                let timestamp = getTimestampForLabel(data.Labels, searchLabel).toString();
                                action(jobStatus.Video.S3ObjectName, timestamp);
                            } else {
                                console.log(err, err.stack);
                            }
                        }
                    );
                }
            });
        }
    }
}

function getTimestampForLabel(labels, filterName) {
    console.log(`Raw label results: ${JSON.stringify(labels)}`);

    let bestTimestamp = 0;
    let highestConfidence = 0;

    labels.forEach(element => {
        if (element.Label.Name.toLowerCase() == filterName.toLowerCase() && 
                element.Label.Confidence > highestConfidence) {
            highestConfidence = element.Label.Confidence;
            bestTimestamp = element.Timestamp;
            console.log(`    *** Found object ${element.Label.Name} at position ${bestTimestamp}.  Confidence = ${highestConfidence}`);
        }
    });

    return bestTimestamp / 1000; // convert to milliseconds
}

function createRekognitionRole() {
    let policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": "sts:AssumeRole",
                "Principal": {
                    "Service": "rekognition.amazonaws.com",
                },
                "Effect": "Allow",
                "Sid": "",
            },
        ],
    };

    let role = new aws.iam.Role("rekognition-role", {
        assumeRolePolicy: JSON.stringify(policy),
    });

    let serviceRoleAccess = new aws.iam.RolePolicyAttachment("rekognition-access", {
        role: role,
        policyArn: "arn:aws:iam::aws:policy/service-role/AmazonRekognitionServiceRole", // use managed AWS policy
    });

    return role;
}

module.exports.VideoLabelProcessor = VideoLabelProcessor;
