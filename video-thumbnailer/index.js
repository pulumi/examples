let cloud = require("@pulumi/cloud-aws");

// A task which runs a containerized FFMPEG job to extract a thumbnail image.
let ffmpegThumbnailTask = new cloud.Task("ffmpegThumbTask", {
    build: "./docker-ffmpeg-thumb",
    memoryReservation: 128,
});

// A bucket to store videos and thumbnails.
let bucket = new cloud.Bucket("bucket");
let bucketName = bucket.bucket.id;

// When a new video is uploaded, run the FFMPEG job on the video file.
bucket.onPut("onNewVideo", bucketArgs => {
    console.log(`A new ${bucketArgs.size}B video was uploaded to ${bucketArgs.key} at ${bucketArgs.eventTime}.`);
    let key = bucketArgs.key;
    let thumbnailFile = key.substring(0, key.indexOf('_')) + '.png';
    let framePos = key.substring(key.indexOf('_')+1, key.indexOf('.')).replace('-',':');
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
