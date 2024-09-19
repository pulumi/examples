import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export class S3Folder extends pulumi.ComponentResource {
  readonly bucket: pulumi.Output<aws.s3.BucketV2>;
  readonly websiteUrl: pulumi.Output<string>;

  /**
   * S3Folder manages a S3 bucket and configures it to serve a static website.
   * @param bucketName The name of the S3 bucket.
   * @param opts
   */
  constructor(bucketName: string, opts: pulumi.ComponentResourceOptions) {
    super("pulumi:examples:S3Folder", bucketName, {}, opts);

    // Create a bucket and expose a website index document
    const siteBucket = new aws.s3.BucketV2(bucketName, {}, { parent: this }); // specify resource parent

    const siteBucketWebsite = new aws.s3.BucketWebsiteConfigurationV2(bucketName, {
        bucket: siteBucket.bucket,
        indexDocument: {suffix: "index.html"}
    }, { parent: this});

    const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
      bucket: siteBucket.id,
      blockPublicAcls: false,
    }, { parent: this });

    // Set the access policy for the bucket so all objects are readable
    const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
      bucket: siteBucket.bucket,
      policy: siteBucket.bucket.apply(this.publicReadPolicyForBucket),
    }, { parent: this, dependsOn: publicAccessBlock }); // specify resource parent

    this.bucket = pulumi.output(siteBucket);
    this.websiteUrl = siteBucketWebsite.websiteEndpoint;

    // Register output properties for this component
    this.registerOutputs({
      bucket: this.bucket,
      websiteUrl: this.websiteUrl,
    });
  }

  publicReadPolicyForBucket(bucketName: string) {
    return JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Principal: "*",
        Action: [
          "s3:GetObject"
        ],
        Resource: [
          `arn:aws:s3:::${bucketName}/*`
        ]
      }]
    });
  }
}
