// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as crypto from "crypto";
import * as fs from "fs";
import * as mime from "mime";

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface FileBucketOpts {
    files: string[];
    policy?: (bucket: aws.s3.Bucket) => pulumi.Output<string>;
}

export class FileBucket {
    public readonly bucket: aws.s3.Bucket;
    public readonly files: { [key: string]: aws.s3.BucketObject };
    public readonly policy: aws.s3.BucketPolicy;

    private readonly fileContents: { [key: string]: string };

    constructor(bucketName: string, opts: FileBucketOpts) {
        this.bucket = new aws.s3.Bucket(bucketName);
        this.fileContents = {};
        this.files = {};
        for (const file of opts.files) {
            this.fileContents[file] = fs.readFileSync(file).toString();
            this.files[file] = new aws.s3.BucketObject(file, {
                bucket: this.bucket,
                source: new pulumi.asset.FileAsset(file),
                contentType: mime.getType(file) || undefined,
            });
        }

        if (opts.policy !== undefined) {
            // Set the access policy for the bucket so all objects are readable
            this.policy = new aws.s3.BucketPolicy(`bucketPolicy`, {
                bucket: this.bucket.bucket,
                // policy: this.bucket.bucket.apply(publicReadPolicyForBucket)
                policy: opts.policy(this.bucket),
            });
        }
    }

    fileIdFromHashedContents(fileName: string): pulumi.Input<string> {
        const digest = crypto
            .createHash("md5")
            .update(this.fileContents[fileName])
            .digest("hex")
            .slice(0, 6);
        return pulumi.interpolate `${this.bucket.bucket}-${digest}`;
    }

    getUrlForFile(file: string): pulumi.Output<string> {
        if (!(file in this.files)) {
            throw new Error(`Bucket does not have file '${file}'`);
        }

        return pulumi
            .all([this.bucket.bucketDomainName, this.files[file].id])
            .apply(([domain, id]) => `${domain}/${id}`);
    }
}

// Create an S3 Bucket Policy to allow public read of all objects in bucket
export function publicReadPolicy(bucket: aws.s3.Bucket): pulumi.Output<string> {
    return pulumi.jsonStringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: "*",
                Action: ["s3:GetObject"],
                Resource: [
                    pulumi.interpolate `arn:aws:s3:::${bucket.bucket}/*`, // policy refers to bucket name explicitly
                ],
            },
        ],
    });
}
