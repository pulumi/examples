import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi";

export class BucketPair extends pulumi.ComponentResource {

    contentBucket: aws.s3.Bucket;
    logsBucket: aws.s3.Bucket;

    constructor(contentBucketName: string, logsBucketName: string, opts: any) {
        super("pulumi:examples:BucketPair", "BucketPair", {}, opts);

        this.contentBucket = new aws.s3.Bucket("contentBucket", {
            bucket: contentBucketName,
        }, { parent: this });

        this.logsBucket = new aws.s3.Bucket("logsBucket", {
            bucket: logsBucketName,
        }, { parent: this });

        // Register output properties for this component
        this.registerOutputs({
            contentBucket: this.contentBucket,
            logsBucket: this.logsBucket
        });
    }
}