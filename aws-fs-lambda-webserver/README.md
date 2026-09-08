[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-fs-lambda-webserver/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-fs-lambda-webserver/README.md#gh-dark-mode-only)

# AWS F# Lambda web server

This example creates a web server in AWS Lambda using the Giraffe web server.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi -C ./pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi -C ./pulumi config set aws:region us-west-2
    ```

1.  Build and publish the Lambda function, making the output available to the Pulumi program:

    ```bash
    dotnet publish ./LambdaWebServer
    ```

1.  Deploy the stack, which archives the published function output and creates the Lambda:

    ```bash
    pulumi up -C ./pulumi
    ```

1.  In a browser, navigate to the URL for `websiteUrl`. You should see the welcome message.

## Cleaning up

Once you're finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy -C ./pulumi
pulumi stack rm -C ./pulumi
```
