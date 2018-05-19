module.exports.getTimestampForLabel = function (labels, filterName) {
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

module.exports.startRekognitionJob = function (bucketName, filename, roleArn, topicArn) {
    var aws = require('aws-sdk');
    var rekognition = new aws.Rekognition();
    
    var params = {
        Video: { 
            S3Object: {
                Bucket: bucketName,
                Name: filename,
            }
        },
        NotificationChannel: {
            RoleArn: roleArn,
            SNSTopicArn: topicArn
        }
    };

    rekognition.startLabelDetection(params, (err, data) => {
        if (!err) {
            console.log(`*** Submitted Rekognition job for ${filename}`);
        }
        else console.log(err, err.stack);        
    });
}

module.exports.processResults = function (jobStatus, success) {
    if (jobStatus.Status == 'SUCCEEDED' && jobStatus.API == 'StartLabelDetection') {
        var aws = require('aws-sdk');
        var rekognition = new aws.Rekognition();

        const searchObject = "cat";
        rekognition.getLabelDetection( { JobId: jobStatus.JobId }, 
            function (err, data) {
                if (!err) {
                    success(data);
                }
                else console.log(err, err.stack); 
            }
        );

        Promise.resolve();
    }    
}
