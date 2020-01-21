import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export const getS3Location = (bucket: aws.s3.Bucket, tableName: string): pulumi.Output<string> => {
    return bucket.arn.apply(a => `s3://${a.split(":::")[1]}/${tableName}`);
}