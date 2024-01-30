[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-apigateway-lambda-serverless/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-apigateway-lambda-serverless/README.md#gh-dark-mode-only)

# Lambda-backed API Gateway

This example provides API endpoints which are executed by AWS Lambda using Python.
The example sets up up two Lambda-backed API Gateways: an API Gateway V1 (REST) and an API Gateway V2 (HTTP). AWS provides some information on the differences between these two API Gateway types: [Announcing HTTP APIs for Amazon API Gateway](https://aws.amazon.com/blogs/compute/announcing-http-apis-for-amazon-api-gateway/) and [API Gateway V2 FAQs](https://aws.amazon.com/api-gateway/faqs/)

This sample uses the following AWS products:

- [Amazon API Gateway](https://aws.amazon.com/api-gateway/) is used as an API proxy
- [AWS Lambda](https://aws.amazon.com/lambda/) is used to process API events by executing typescript/javascript code

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2.  Create a new stack:

    ```bash
    $ pulumi stack init aws-py-apigateway-lambda-serverless
    ```

3.  Set the AWS region:

    ```bash
    $ pulumi config set aws:region us-east-2
    ```

## Deploy the App

1.  Run `pulumi up` to preview and deploy changes:

2.  To view the runtime logs of the Lambda function, use the `pulumi logs` command. To get a log stream, use `pulumi logs --follow`.

## Test the Endpoints

Use a HTTP tool like `curl` or [`httpie`](https://github.com/httpie/httpie) (`pip3 install httpie`) to query the API Gateway endpoints using the Pulumi stack outputs.

Example using `curl`:

```
curl $(pulumi stack output apigateway-rest-endpoint)
curl $(pulumi stack output apigatewayv2-http-endpoint)
```

Example using `httpie`:

```
http $(pulumi stack output apigateway-rest-endpoint)
http $(pulumi stack output apigatewayv2-http-endpoint)
```

Output should include `"Cheers from AWS Lambda!!"`.

## Clean Up

1.  Run `pulumi destroy` to tear down all resources.

2.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.

## Summary

In this tutorial, you built a lambda-backed API on AWS using API Gateway, lambda functions, and Pulumi. This serverless solution is highly scaleable, resilient, and stateless.

## Next Steps

- [Create a frontend to interact with this api](https://www.pulumi.com/docs/tutorials/aws/s3-website/)
