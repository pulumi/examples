# Static Website using AWS and TypeScript

This example serves a static website using TypeScript and AWS.

This sample uses the following AWS products:

- [Amazon S3](https://aws.amazon.com/s3/) is used to store the website's contents.
- [Amazon CloudFront](https://aws.amazon.com/cloudfront/) is the CDN serving content.
- [Amazon Route53](https://aws.amazon.com/route53/) is used to set up the DNS for the website.
- [Amazon Certificate Manager](https://aws.amazon.com/certificate-manager/) is used for securing things via HTTPS.

## Getting Started

Install prerequisites and build the Pulumi program with:

```bash
yarn install
yarn build
```

Configure the Pulumi program. There are several configuration settings that need to be
set:

- `certificateArn` - ACM certificate to serve content from. ACM certificate creation needs to be
  done manually. Also, any certificate used to secure a CloudFront distribution must be created
  in the `us-east-1` region.
- `targetDomain` - The domain to serve the website at (e.g. www.example.com). It is assumed that
  the parent domain (example.com) is a Route53 Hosted Zone in the AWS account you are running the
  Pulumi program in.
- `pathToWebsiteContents` - Directory of the website's contents. e.g. the `./www` folder.

## How it works

The Pulumi program constructs the S3 bucket, and constructs an `aws.s3.BucketObject` object
for every file in `config.pathToWebsiteContents`. This is essentially tracks every file on
your static website as a Pulumi-managed resource. So a subsequent `pulumi update` where the
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
things like custom error pages, cache TTLs, and so on.

Finally, an `aws.route53.Record` is created to associate the domain name (www.example.com)
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

```
"PreconditionFailed: The request failed because it didn't meet the preconditions in one or more
request-header fields."
```

This is caused by CloudFront confirming the ETag of the resource before applying any updates.
ETag is essentially a "version", and AWS is rejecting any requests that are trying to update
any version but the "latest".

This error will occurr when the state of the ETag get out of sync between the Pulumi Service
and AWS. (Which can happen when inspecting the CloudFront distribution in the AWS console.)

This will get fixed in Pulumi soon, but for the time being you can find workaround steps in
the [issue on GitHub](pulumi/pulumi/issues/1449).
