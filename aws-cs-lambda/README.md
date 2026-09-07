[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-lambda/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-lambda/README.md#gh-dark-mode-only)

# AWS C# Lambda

This example creates an AWS Lambda function that does a simple `.ToUpper` on the string input and returns it.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1.  Build and publish the Lambda function, making the output available to the Pulumi program:

    ```bash
    dotnet publish ./DotnetLambda/src/DotnetLambda/ -c Release
    ```

1.  Create a new stack and set the AWS region to deploy into:

    ```bash
    pulumi stack init dev -C ./pulumi
    pulumi config set aws:region us-east-1 -C ./pulumi
    ```

1.  Deploy the stack to archive the published function output and create the Lambda:

    ```bash
    pulumi up -C ./pulumi
    ```

1.  Call the Lambda function from the AWS CLI with "foo" as the payload:

    ```bash
    aws lambda invoke \
    --function-name $(pulumi stack output Lambda -C ./pulumi) \
    --region $(pulumi config get aws:region -C ./pulumi) \
    --cli-binary-format raw-in-base64-out \
    --payload '"foo"' \
    output.json

    cat output.json # view the output file with your tool of choice
    # "FOO"
    ```

From there, feel free to experiment. Simply making edits, rebuilding your handler, and running `pulumi up` will update your function.

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy -C ./pulumi
pulumi stack rm -C ./pulumi
```
