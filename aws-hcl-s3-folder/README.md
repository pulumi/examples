[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-hcl-s3-folder/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-hcl-s3-folder/README.md#gh-dark-mode-only)

# Host a static website on Amazon S3, written in HCL

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html),
written in [Pulumi HCL](https://www.pulumi.com/docs/languages-sdks/hcl/). Pulumi installs the HCL
language plugin and the Terraform AWS provider automatically the first time you run the program.

Note: some values in this example will be different from run to run. These values are indicated
with `***`.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init website-testing
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating (website-testing)

         Type                                          Name                              Status
     +   pulumi:pulumi:Stack                           aws-hcl-s3-folder-website-testing created
     +   ├─ aws:s3:Bucket                              site_bucket                       created
     +   ├─ aws:s3:BucketWebsiteConfiguration          site_config                       created
     +   ├─ aws:s3:BucketPublicAccessBlock             public_access_block               created
     +   ├─ aws:s3:BucketObject                        site_files["favicon.png"]         created
     +   ├─ aws:s3:BucketObject                        site_files["index.html"]          created
     +   └─ aws:s3:BucketPolicy                        bucket_policy                     created

    Resources:
        + 7 created

    Duration: ***
    ```

1.  To see the resources that were created, run `pulumi stack output`:

    ```bash
    pulumi stack output
    ```

    ```
    Current stack outputs (2):
        OUTPUT       VALUE
        bucket_name  s3-website-bucket***
        website_url  ***.s3-website-us-west-2.amazonaws.com
    ```

1.  Open the site URL in a browser to see both the rendered HTML and the favicon:

    ```bash
    pulumi stack output website_url
    ```

    ```
    ***.s3-website-us-west-2.amazonaws.com
    ```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
