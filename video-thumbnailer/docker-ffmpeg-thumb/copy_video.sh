#!/bin/bash

echo "Copying from S3 ${S3_BUCKET}/${INPUT_VIDEO_FILE_NAME} to ${INPUT_VIDEO_FILE_NAME} ..."
aws s3 cp s3://${S3_BUCKET}/${INPUT_VIDEO_FILE_NAME} ./${INPUT_VIDEO_FILE_NAME}
