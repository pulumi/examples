import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi";

export class BucketPair extends pulumi.ComponentResource {

    contentBucket: aws.s3.BucketV2;
    logsBucket: aws.s3.BucketV2;

    constructor(contentBucketName: string, logsBucketName: string, opts: any) {
        super("pulumi:examples:BucketPair", "BucketPair", {}, opts);

        this.contentBucket = new aws.s3.BucketV2("contentBucket", {
            bucket: contentBucketName,
        }, { parent: this });

        this.logsBucket = new aws.s3.BucketV2("logsBucket", {
            bucket: logsBucketName,
        }, { parent: this });

        // Register output properties for this component
        this.registerOutputs({
            contentBucket: this.contentBucket,
            logsBucket: this.logsBucket
        });
    }
}