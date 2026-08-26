[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-hcl-s3-folder/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-hcl-s3-folder/README.md#gh-dark-mode-only)

# Host a Static Website on Amazon S3, Written in HCL

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html),
written in [Pulumi HCL](https://www.pulumi.com/docs/languages-sdks/hcl/). Pulumi installs the HCL
language plugin and the Terraform AWS provider automatically the first time you run the program.

## Deploying and running the program

Note: some values in this example will be different from run to run. These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    $ pulumi stack init website-testing
    ```

1.  [Configure your AWS credentials](https://www.pulumi.com/registry/packages/aws/installation-configuration/)
    and set the AWS region:

    ```bash
    $ export AWS_REGION=us-west-2
    ```

1.  Run `pulumi up` to preview and deploy changes. After the preview is shown you will be
    prompted if you want to continue or not.

    ```bash
    $ pulumi up
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
    $ pulumi stack output
    Current stack outputs (2):
        OUTPUT       VALUE
        bucket_name  s3-website-bucket***
        website_url  ***.s3-website-us-west-2.amazonaws.com
    ```

1.  Open the site URL in a browser to see both the rendered HTML and the favicon:

    ```bash
    $ pulumi stack output website_url
    ***.s3-website-us-west-2.amazonaws.com
    ```

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
