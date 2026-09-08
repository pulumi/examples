[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-stepfunctions/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-stepfunctions/README.md#gh-dark-mode-only)

# AWS Step Functions

A basic example that demonstrates using AWS Step Functions with a Lambda function, written in Python.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init stepfunctions-dev
    ```

1. Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-2
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

1. Start an execution using the AWS CLI (or from the console at https://console.aws.amazon.com/states):

    ```bash
    aws stepfunctions start-execution --state-machine-arn $(pulumi stack output state_machine_arn)
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
