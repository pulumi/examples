"use strict";

const cloud = require("@pulumi/cloud-aws");
const pulumi = require("@pulumi/pulumi");

class VideoLabelProcessor {

    constructor() {
        this.topic = new cloud.Topic("AmazonRekognitionTopic");

        this.config = new pulumi.Config("video-thumbnailer-rekognition");
        this.roleArn = this.config.require("RekognitionRoleArn");

        // filter to the timestamp with the highest confidence for a label, and call `action` with that timestamp
        this.onLabelResult = (searchLabel, action) => {
            this.topic.subscribe("labelResults", (jobStatus) => {                
                this.processResults(jobStatus, (data) => {
                    let timestamp = this.getTimestampForLabel(data.Labels, searchLabel).toString();
                    action(jobStatus.Video.S3ObjectName, timestamp);
                });
            });
        }

        this.processResults = (jobStatus, success) => {
            if (jobStatus.Status == 'SUCCEEDED' && jobStatus.API == 'StartLabelDetection') {
                var aws = require('aws-sdk');
                var rekognition = new aws.Rekognition();
        
                rekognition.getLabelDetection( { JobId: jobStatus.JobId }, 
                    function (err, data) {
                        if (!err) {
                            success(data);
                        }
                        else console.log(err, err.stack); 
                    }
                );
            }    
        }

        this.startRekognitionJob = (bucketName, filename) => {
            var aws = require('aws-sdk');
            var rekognition = new aws.Rekognition();
            
            var params = {
                Video: { 
                    S3Object: {
                        Bucket: bucketName.get(),
                        Name: filename,
                    }
                },
                NotificationChannel: {
                    RoleArn: this.roleArn,
                    SNSTopicArn: this.topic.topic.arn.get()
                }
            };
        
            rekognition.startLabelDetection(params, (err, data) => {
                if (!err) {
                    console.log(`*** Submitted Rekognition job for ${filename}`);
                }
                else console.log(err, err.stack);        
            });
        }
        
        this.getTimestampForLabel = (labels, filterName) => {
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
    }

}

module.exports.VideoLabelProcessor = VideoLabelProcessor;

