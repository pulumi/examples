# Serverless AI Inference Endpoint with Amazon Bedrock

A minimal, production-shaped starting point for a generative-AI feature: an HTTP endpoint that takes a prompt, calls an [Amazon Bedrock](https://aws.amazon.com/bedrock/) foundation model, and returns the generated text.

It provisions:

- A **Lambda function** that invokes a Bedrock model, with a public **Function URL** so you can call it over HTTPS.
- An **IAM role** scoped to least privilege - the function may call `bedrock:InvokeModel` on the configured model and nothing else.
- A **CloudWatch log group** with a retention policy for the function's logs.

The function code lives in `lambda/` and uses the AWS SDK for JavaScript's Bedrock Runtime client (bundled with the Lambda Node.js 20 runtime).

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure your AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
1. Enable access to the Bedrock model you want to use in the [Bedrock console](https://console.aws.amazon.com/bedrock/home#/modelaccess) (**Model access**), in the same region you deploy to.

## Deploying and running the program

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region (and optionally the model):

    ```bash
    pulumi config set aws:region us-west-2
    # Optional - defaults to anthropic.claude-haiku-4-5-20251001-v1:0
    pulumi config set modelId anthropic.claude-haiku-4-5-20251001-v1:0
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Run `pulumi up` to preview and deploy:

    ```bash
    pulumi up
    ```

1.  Call the endpoint with a prompt:

    ```bash
    curl -X POST "$(pulumi stack output endpointUrl)" \
      -H "content-type: application/json" \
      -d '{"prompt":"Write one sentence about infrastructure as code."}'
    ```

    ```json
    {"text":"Infrastructure as code lets you define and manage cloud resources with the same version control, review, and automation practices you use for application code."}
    ```

## Clean up

To tear down the resources, run:

```bash
pulumi destroy
pulumi stack rm
```

## Summary

In this example you deployed a serverless inference endpoint on AWS: a Lambda Function URL that invokes an Amazon Bedrock foundation model with a least-privilege IAM policy. Point the `modelId` config at any Bedrock model you have access to, and swap the handler in `lambda/` to shape prompts and responses for your own application.
