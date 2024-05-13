'use strict';
const { execSync } = require('child_process');

function run(command) {
    console.log(command);
    const result = execSync(command, {stdio: 'inherit'});
    if (result != null) {
        console.log(result.toString());
    }
}

exports.handler = async (event) => {
    console.log("Video handler called");

    if (!event.Records) {
        return;
    }

    for (const record of event.Records) {
        const fileName = record.s3.object.key;
        const bucketName = record.s3.bucket.name;
        const thumbnailFile = fileName.substring(0, fileName.indexOf("_")) + ".jpg";
        const framePos = fileName.substring(fileName.indexOf("_")+1, fileName.indexOf(".")).replace("-", ":");
        
        run(`aws s3 cp s3://${bucketName}/${fileName} /tmp/${fileName}`);
        run(`ffmpeg -v error -i /tmp/${fileName} -ss ${framePos} -vframes 1 -f image2 -an -y /tmp/${thumbnailFile}`);
        run(`aws s3 cp /tmp/${thumbnailFile} s3://${bucketName}/${thumbnailFile}`);

        console.log(`*** New thumbnail: file ${fileName} was saved at ${record.eventTime}.`);
    }    
};
