[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-lambda-slack/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-lambda-slack/README.md#gh-dark-mode-only)

# AWS Lambda for Slack notification

A Pulumi example that:

- Creates an AWS Lambda function to post a message on Slack via a Webhook URL.
- Adds an AWS API Gateway so the Lambda can be invoked externally, e.g, via GitHub Webhooks.
- Uses a Pulumi ESC Environment to dynamically retrieve AWS OIDC Credentials and the Slack URL from AWS Secrets Manager.

Last update: September 2024

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
1. A [Pulumi Cloud account](https://app.pulumi.com/signup)
1. AWS OIDC configured in a Pulumi ESC Environment
1. AWS Secrets Manager with a Slack Webhook URL secret
1. A properly configured Slack Webhook URL

## Deploying the example

This Pulumi example is written as a template. It is meant to be copied via `pulumi new`.

1. Log in to your Pulumi Cloud if you haven't already:

    ```bash
    pulumi login
    ```

1. Create a new directory and change into it:

    ```bash
    mkdir my-slack-demo
    cd my-slack-demo
    ```

1. Start your Pulumi project from this example:

    ```bash
    pulumi new https://github.com/pulumi/examples/aws-ts-lambda-slack
    ```

1. Add your Pulumi ESC Environment and deploy:

    ```bash
    pulumi config env add YOUR_ESC_ENV --yes --non-interactive
    pulumi up
    ```

    Select 'yes' to confirm the expected changes.

## Cleaning up

To clean up your infrastructure, run:

```bash
pulumi destroy
pulumi stack rm
```
