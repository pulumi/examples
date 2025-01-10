# AWS Lambda for Slack Notification

A Pulumi example to:

- Creates an AWS Lambda function to post a message on Slack via a Webhook URL.
- Adds an AWS API Gateway so the Lambda can be invoked externally, e.g,  via GitHub Webhooks.
- Uses a Pulumi ESC Environment to dynamically retrieve AWS OIDC Credentials and the Slack URL from AWS Secrets Manager.

Last update: September 2024

## 📋 Pre-requisites

- AWS OIDC configured in an Pulumi ESC Environment
- AWS Secrets Manager with a Slack Webhook URL secret
- A properly configured Slack Webhook URL
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Pulumi Cloud account](https://app.pulumi.com/signup)
- [npm](https://www.npmjs.com/get-npm)

## 👩‍🏫 Get started

This Pulumi example is written as a template. It is meant to be copied via `pulumi new`

```bash
# login to your Pulumi Cloud if you haven't already
$ pulumi login

# create a new dir and cd to it
$ mkdir my-slack-demo
$ cd my-slack-demo

# start your pulumi project
$ pulumi new  https://github.com/pulumi/examples/aws-ts-lambda-slack
```

```bash
# Add your Pulumi ESC Environment
$ pulumi config env add YOUR_ESC_ENV --yes --non-interactive   
$ pulumi up
# select 'yes' to confirm the expected changes
# 🎉 Ta-Da!
```

## 🧹 Clean up

To clean up your infrastructure, run:

```bash
$ pulumi destroy
# select 'yes' to confirm the expected changes
```
