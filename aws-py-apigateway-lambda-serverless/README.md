[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-apigateway-lambda-serverless/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-apigateway-lambda-serverless/README.md#gh-dark-mode-only)

# Lambda-backed API Gateway

This example provides API endpoints which are executed by AWS Lambda using Python.
The example sets up two Lambda-backed API Gateways: an API Gateway V1 (REST) and an API Gateway V2 (HTTP). AWS provides some information on the differences between these two API Gateway types: [Announcing HTTP APIs for Amazon API Gateway](https://aws.amazon.com/blogs/compute/announcing-http-apis-for-amazon-api-gateway/) and [API Gateway V2 FAQs](https://aws.amazon.com/api-gateway/faqs/).

This sample uses the following AWS products:

- [Amazon API Gateway](https://aws.amazon.com/api-gateway/) is used as an API proxy
- [AWS Lambda](https://aws.amazon.com/lambda/) is used to process API events by executing Python code

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-2
    ```

1.  Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

1.  To view the runtime logs of the Lambda function, use the `pulumi logs` command. To get a log stream, use `pulumi logs --follow`.

### Test the endpoints

Use a HTTP tool like `curl` or [`httpie`](https://github.com/httpie/httpie) (`pip3 install httpie`) to query the API Gateway endpoints using the Pulumi stack outputs.

Example using `curl`:

```bash
curl $(pulumi stack output apigateway-rest-endpoint)
curl $(pulumi stack output apigatewayv2-http-endpoint)
```

Example using `httpie`:

```bash
http $(pulumi stack output apigateway-rest-endpoint)
http $(pulumi stack output apigatewayv2-http-endpoint)
```

Output should include `"Cheers from AWS Lambda!!"`.

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```

## Summary

In this tutorial, you built a lambda-backed API on AWS using API Gateway, lambda functions, and Pulumi. This serverless solution is highly scaleable, resilient, and stateless.

## Next steps

- [Create a frontend to interact with this API](https://www.pulumi.com/docs/tutorials/aws/s3-website/)
