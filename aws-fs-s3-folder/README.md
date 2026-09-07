[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-fs-s3-folder/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-fs-s3-folder/README.md#gh-dark-mode-only)

# Host a static website on Amazon S3

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html).

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
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
    Previewing update (dev):
        Type                       Name                  Plan
    +   pulumi:pulumi:Stack        aws-cs-s3-folder-dev  create
    +   └─ aws:s3:Bucket         my-bucket             create
    +      ├─ aws:s3:BucketObject  index.html            create
    +      └─ aws:s3:BucketObject  favicon.png           create

    Resources:
        + 4 to create

    Outputs:
        endpoint: "http://my-bucket-1234567.s3-website.us-west-2.amazonaws.com"
    ```

1.  Navigate to the website URL:

    ```bash
    curl $(pulumi stack output endpoint)
    ```

    ```
    <html><head>
        <title>Hello S3</title><meta charset="UTF-8">
        <link rel="shortcut icon" href="/favicon.png" type="image/png">
    </head>
    <body><p>Hello, world!</p><p>Made with ❤️ with <a href="https://pulumi.com">Pulumi</a></p>
    </body></html>
    ```

## Cleaning up

Once you're finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
