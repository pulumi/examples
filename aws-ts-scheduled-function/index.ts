// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import { ObjectIdentifier } from "aws-sdk/clients/s3";


// Create an AWS resource (S3 Bucket)
const trashBucket = new aws.s3.Bucket("trash");

// A handler function that will list objects in the bucket and bulk delete them
const emptyTrash: aws.cloudwatch.EventRuleEventHandler = async (
  event: aws.cloudwatch.EventRuleEvent,
) => {
  const s3Client = new aws.sdk.S3();
  const bucket = trashBucket.id.get();

  const { Contents = [] } = await s3Client
    .listObjects({ Bucket: bucket })
    .promise();
  const objects: ObjectIdentifier[] = Contents.map(object => {
    return { Key: object.Key! };
  });

  await s3Client
    .deleteObjects({
      Bucket: bucket,
      Delete: { Objects: objects, Quiet: false },
    })
    .promise()
    .catch(error => console.log(error));
  console.log(
    `Deleted ${Contents.length} item${
    Contents.length === 1 ? "" : "s"
    } from ${bucket}.`);
};

// Schedule the function to run every Friday at 11:00pm UTC (6:00pm EST)
// More info on Schedule Expressions at
// https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
const emptyTrashSchedule: aws.cloudwatch.EventRuleEventSubscription = aws.cloudwatch.onSchedule(
  "emptyTrash",
  "cron(0 23 ? * FRI *)",
  emptyTrash,
);

// Export the name of the bucket
export const bucketName = trashBucket.id;
