[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-static-website/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-static-website/README.md#gh-dark-mode-only)

# Secure Static Website Using Amazon S3, CloudFront, Route53, and Certificate Manager

This example serves a static website using Python and AWS.

This sample uses the following AWS products:

- [Amazon S3](https://aws.amazon.com/s3/) is used to store the website's contents.
- [Amazon CloudFront](https://aws.amazon.com/cloudfront/) is the CDN serving content.
- [Amazon Route53](https://aws.amazon.com/route53/) is used to set up the DNS for the website.
- [Amazon Certificate Manager](https://aws.amazon.com/certificate-manager/) is used for securing things via HTTPS.

## Getting Started

Configure the Pulumi program. There are several configuration settings that need to be
set:

- `targetDomain` - The domain to serve the website at (e.g. www.example.com). It is assumed that
  the parent domain (example.com) is a Route53 Hosted Zone in the AWS account you are running the
  Pulumi program in.
- `pathToWebsiteContents` - Directory of the website's contents. e.g. the `./www` folder.

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1. Create a new stack:

    ```bash
    $ pulumi stack init website-testing
    ```

1. Set the AWS region:

    ```bash
    $ pulumi config set aws:region us-west-2
    ```

1. Run `pulumi up` to preview and deploy changes.  After the preview is shown you will be
    prompted if you want to continue or not.

    ```bash
    $ pulumi up
    Previewing update (example):
        Type                              Name                                      Plan
    +   pulumi:pulumi:Stack               static-website-example                    create
    +   ├─ pulumi:providers:aws           east                                      create
    +   ├─ aws:s3:Bucket                  requestLogs                               create
    +   ├─ aws:s3:Bucket                  contentBucket                             create
    +   │  ├─ aws:s3:BucketObject         404.html                                  create
    +   │  └─ aws:s3:BucketObject         index.html                                create
    +   ├─ aws:acm:Certificate            certificate                               create
    +   ├─ aws:route53:Record             ***-validation                            create
    +   ├─ aws:acm:CertificateValidation  certificateValidation                     create
    +   ├─ aws:cloudfront:Distribution    cdn                                       create
    +   └─ aws:route53:Record             ***                                       create
    ```

1. To see the resources that were created, run `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (4):
        OUTPUT                           VALUE
        cloudfront_domain                ***.cloudfront.net
        content_bucket_url               s3://***
        content_bucket_website_endpoint  ***.s3-website-us-west-2.amazonaws.com
        target_domain_endpoint           https://***/
    ```

1. To see that the S3 objects exist, you can either use the AWS Console or the AWS CLI:

    ```bash
    $ aws s3 ls $(pulumi stack output content_bucket_url)
    2020-02-21 16:58:48        262 404.html
    2020-02-21 16:58:48        394 index.html
    ```

1. Open a browser to the target domain endpoint from above to see your beautiful static website. (Since we don't wait for the CloudFront distribution to completely sync, you may have to wait a few minutes)

1. To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.

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

This error will occur when the state of the ETag gets out of sync between Pulumi Cloud
and AWS. (This can happen when inspecting the CloudFront distribution in the AWS console.)

You can fix this by running `pulumi refresh` to pickup the newer ETag values.

## Deployment Speed

This example creates an `aws.S3.BucketObject` for every file served from the website. When deploying
large websites, that can lead to very long updates as every individual file is checked for any
changes.

It may be more efficient to not manage individual files using Pulumi and instead just use the
AWS CLI to sync local files with the S3 bucket directly.

Remove the call to `crawlDirectory` and run `pulumi up`. Pulumi will then delete the contents
of the S3 bucket, and no longer manage their contents. Then do a bulk upload outside of Pulumi
using the AWS CLI.

```bash
aws s3 sync ./www/ s3://example-bucket/
```
