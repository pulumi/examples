[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-stepfunctions/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-stepfunctions/README.md#gh-dark-mode-only)

# AWS Step Functions

A basic example that demonstrates using AWS Step Functions with a Lambda function.

This example also utilizes our [Stack Readme](https://www.pulumi.com/docs/intro/pulumi-cloud/projects-and-stacks/#stack-readme) feature. You can view the stack readme by going to the console by running `pulumi console` and selecting the README tab. See the [`stack-readme-ts`](https://github.com/pulumi/examples/tree/master/stack-readme-ts) example for a more detailed example.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init stepfunctions-dev
    ```

1.  Set the AWS region:

    ```bash
    pulumi config set aws:region us-east-2
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Preview and deploy the changes:

    ```bash
    pulumi up
    ```

1.  Start an execution using the AWS CLI (or from the console at https://console.aws.amazon.com/states):

    ```bash
    aws stepfunctions start-execution --state-machine-arn $(pulumi stack output stateMachineArn)
    ```

## Cleaning up

Once you're done, destroy the resources and remove the stack:

```bash
pulumi destroy
pulumi stack rm
```
