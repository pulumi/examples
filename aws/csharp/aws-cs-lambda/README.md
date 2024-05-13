[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-lambda/pulumi/Pulumi.cs#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-lambda/pulumi/Pulumi.cs#gh-dark-mode-only)

# AWS C# Lambda
This example creates an AWS Lambda function that does a simple `.ToUpper` on the string input and returns it.

## Deploying the App

To deploy your infrastructure, follow the steps below.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Build and publish the lambda function, making the output available to our Pulumi program.

    ```bash
    dotnet publish ./DotnetLambda/src/DotnetLambda/
    ```

2. Execute our Pulumi program to archive our published function output, and create our lambda.

    ```bash
    pulumi up -C ./pulumi
    ```

3. Call our Lambda function from the AWS CLI with "foo" as the payload.

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

6. From there, feel free to experiment. Simply making edits, rebuilding your handler, and running `pulumi up` will update your function.

7. Afterwards, destroy your stack and remove it:

    ```bash
    pulumi destroy --yes
    pulumi stack rm --yes
    ```
