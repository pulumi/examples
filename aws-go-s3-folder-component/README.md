[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-s3-folder-component/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-s3-folder-component/README.md#gh-dark-mode-only)

# Static website on Amazon S3

The component version of [aws-go-s3-folder](../aws-go-s3-folder/). For a detailed walkthrough of this example, see [Tutorial: Pulumi Components](https://www.pulumi.com/docs/tutorials/aws/s3-folder-component/).

Note: some values in this example will be different from run to run. These values are indicated
with `***`.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init website-component-testing
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1.  Install dependencies:

    ```bash
    go mod download
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating stack 'website-component-testing'
    Performing changes:

        Type                        Name                                                  Status
    +   pulumi:pulumi:Stack         aws-go-s3-folder-component-website-component-testing  created
    +   └─ pulumi:example:S3Folder  pulumi-static-site                                     created
    +      ├─ aws:s3:Bucket         pulumi-static-site                                     created
    +      ├─ aws:s3:BucketPolicy   bucketPolicy                                          created
    +      ├─ aws:s3:BucketObject   index.html                                            created
    +      └─ aws:s3:BucketObject   favicon.png                                           created

    Outputs:
        bucketName: "pulumi-static-site-***"
        websiteUrl: "pulumi-static-site-***.s3-website-us-west-2.amazonaws.com"

    Resources:
        + 6 created

    Duration: 14s

    Permalink: ***
    ```

1.  To see the resources that were created, run `pulumi stack output`:

    ```bash
    pulumi stack output
    ```

    ```
    Current stack outputs (2):
        OUTPUT      VALUE
        bucketName  pulumi-static-site-***
        websiteUrl  pulumi-static-site-***.s3-website-us-west-2.amazonaws.com
    ```

1.  To see that the S3 objects exist, you can either use the AWS Console or the AWS CLI:

    ```bash
    aws s3 ls $(pulumi stack output bucketName)
    ```

    ```
    2020-04-20 22:52:15      13731 favicon.png
    2020-04-20 22:52:15        249 index.html
    ```

1.  Open the site URL in a browser to see both the rendered HTML and the favicon:

    ```bash
    pulumi stack output websiteUrl
    ```

    ```
    pulumi-static-site-***.s3-website-us-west-2.amazonaws.com
    ```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
