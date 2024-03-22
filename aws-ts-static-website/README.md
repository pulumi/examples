[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-static-website/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-static-website/README.md#gh-dark-mode-only)

# Secure Static Website Using Amazon S3, CloudFront, Route53, and Certificate Manager

This example serves a static website using TypeScript and AWS.

This sample uses the following AWS products:

- [Amazon S3](https://aws.amazon.com/s3/) is used to store the website's contents.
- [Amazon CloudFront](https://aws.amazon.com/cloudfront/) is the CDN serving content.
- [Amazon Route53](https://aws.amazon.com/route53/) is used to set up the DNS for the website.
- [Amazon Certificate Manager](https://aws.amazon.com/certificate-manager/) is used for securing things via HTTPS.

## Getting Started

Install prerequisites with:

```bash
npm install
```

Configure the Pulumi program using ```pulumi config set KEY VALUE```. There are several configuration settings that need to be
set:

- `certificateArn` - ACM certificate to serve content from. ACM certificate creation needs to be
  done manually. Also, any certificate used to secure a CloudFront distribution must be created
  in the `us-east-1` region.
- `targetDomain` - The domain to serve the website at (e.g. www.example.com). It is assumed that
  the parent domain (example.com) is a Route53 Hosted Zone in the AWS account you are running the
  Pulumi program in.
- `pathToWebsiteContents` - Directory of the website's contents. e.g. the `./www` folder.
- `includeWWW` - If true this will create an additional alias record for the www subdomain to your cloudfront distribution.

## How it works

The Pulumi program constructs the S3 bucket, and constructs an `aws.s3.BucketObject` object
for every file in `config.pathToWebsiteContents`. This is essentially tracks every file on
your static website as a Pulumi-managed resource. So a subsequent `pulumi up` where the
file's contents have changed will result in an update to the `aws.s3.BucketObject` resource.

Note how the `contentType` property is set by calling the NPM package [mime](https://www.npmjs.com/package/mime).

```typescript
const contentFile = new aws.s3.BucketObject(
    relativeFilePath,
    {
        key: relativeFilePath,

        acl: "public-read",
        bucket: contentBucket,
        contentType: mime.getType(filePath) || undefined,
        source: new pulumi.asset.FileAsset(filePath),
    });
```

The Pulumi program then creates an `aws.cloudfront.Distribution` resource, which will serve
the contents of the S3 bucket. The CloudFront distribution can be configured to handle
things like custom error pages, cache TTLs, and so on. If `includeWWW` is set to true both the
cloudfront distribution and any generated certificate will contain an alias for accessing the site
from the www subdomain.

Finally, an `aws.route53.Record(s)` is created to associate the domain name (example.com)
with the CloudFront distribution (which would be something like d3naiyyld9222b.cloudfront.net).

```typescript
return new aws.route53.Record(
        targetDomain,
        {
            name: domainParts.subdomain,
            zoneId: hostedZone.zoneId,
            type: "A",
            aliases: [
                {
                    name: distribution.domainName,
                    zoneId: distribution.hostedZoneId,
                    evaluateTargetHealth: true,
                },
            ],
        });
```

## Troubleshooting

### Scary HTTPS Warning

When you create an S3 bucket and CloudFront distribution shortly after one another, you'll see
what looks to be HTTPS configuration issues. This has to do with the replication delay between
S3, CloudFront, and the world-wide DNS system.

Just wait 15 minutes or so, and the error will go away. Be sure to refresh in an incognito
window, which will avoid any local caches your browser might have.

### "PreconditionFailed: The request failed because it didn't meet the preconditions"

Sometimes updating the CloudFront distribution will fail with:

```text
"PreconditionFailed: The request failed because it didn't meet the preconditions in one or more
request-header fields."
```
This is caused by CloudFront confirming the ETag of the resource before applying any updates.
ETag is essentially a "version", and AWS is rejecting any requests that are trying to update
any version but the "latest".

This error will occur when the state of the ETag get out of sync between Pulumi Cloud
and AWS. (This can happen when inspecting the CloudFront distribution in the AWS console.)

You can fix this by running `pulumi refresh` to pickup the newer ETag values.

## Deployment Speed

This example creates a `aws.S3.BucketObject` for every file served from the website. When deploying
large websites, that can lead to very long updates as every individual file is checked for any
changes.

It may be more efficient to not manage individual files using Pulumi and and instead just use the
AWS CLI to sync local files with the S3 bucket directly.

Remove the call to `crawlDirectory` and run `pulumi up`. Pulumi will then delete the contents
of the S3 bucket, and no longer manage their contents. Then do a bulk upload outside of Pulumi
using the AWS CLI.

```bash
aws s3 sync ./www/ s3://example-bucket/
```

##  Access Denied while creating S3 bucket

This error can occur when a bucket with the same name as targetDomain already exists. Remove all items from the pre-existing bucket
and delete the bucket to continue.

## Fail to delete S3 bucket while running pulumi destroy, this bucket is not empty.

The contents of the S3 bucket are not automatically deleted. You can manually delete these contents in the AWS Console or with
the AWS CLI.

## pulumi up fails when the targetDomain includes a www subdomain and includeWWW is set to true

This will fail because the program will attempt to create an alias record and certificate for both the targetDomain
and `www.${targetDomain}` when includeWWW is set to true.
