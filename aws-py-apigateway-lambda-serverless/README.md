# [App Description] using [Service or Tool]

<!-- Use Title Case for all Titles -->
<!-- Most of the examples are transformed into tutorials on https://www.pulumi.com/docs/tutorials/ and are sorted by cloud and language. There is no need to include the cloud provider name or the language in the title.

<!-- Our examples have a specific structure. Learn more at CONTRIBUTING.md -->

Set up two lambda-backed API Gateways: an API Gateway V1 (REST) and an API Gateway V2 (HTTP). AWS provides some information on the differences between these two API Gateway types, here: (Announcing HTTP APIs for Amazon API Gateway)[https://aws.amazon.com/blogs/compute/announcing-http-apis-for-amazon-api-gateway/] & (API Gateway V2 FAQs)[https://aws.amazon.com/api-gateway/faqs/]

# Lambda-backed API Gateway

This example provides API endpoints which are executed by lambda using TypeScript and AWS.

This sample uses the following AWS products:

- [Amazon API Gateway](https://aws.amazon.com/api-gateway/) is used as an API proxy
- [AWS Lambda](https://aws.amazon.com/lambda/) is used to process API events by executing typescript/javascript code

## Prerequisites

<!-- The Prerequisites section includes an ordered list of required installation and configuration steps before the reader can deploy the Pulumi example. -->

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

## Clean Up

1.  Run `pulumi destroy` to tear down all resources.

2.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi Console.

<!-- Example:
1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure your AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
-->

## Summary

In this tutorial, you built a lambda-backed API on AWS using API Gateway, lambda functions, and Pulumi. This serverless solution is highly scaleable, resilient, and stateless.

<!-- Give a quick recap of what the readers have learned and optionally provide places for further exploration. -->

## Next Steps

- [Create a frontend to interact with this api](https://www.pulumi.com/docs/tutorials/aws/s3-website/)
<!-- Optionally include an unordered list of relevant Pulumi tutorials. -->

<!-- Example:
- [Create a load-balanced, hosted NGINX container service](https://www.pulumi.com/docs/tutorials/aws/ecs-fargate/)
- [Create an EC2-based WebServer and associated infrastructure](https://www.pulumi.com/docs/tutorials/aws/ec2-webserver/)
-->