# [App Description] using [Service or Tool]

<!-- Use Title Case for all Titles -->
<!-- Most of the examples are transformed into tutorials on https://www.pulumi.com/docs/tutorials/ and are sorted by cloud and language. There is no need to include the cloud provider name or the language in the title.

<!-- Our examples have a specific structure. Learn more at CONTRIBUTING.md -->

Set up a lambda-backed API Gateway api endpoint using the Pulumi Crosswalk (`@pulumi/awsx`) typescript library. The awsx library provides a simple, declarative way to specify the routes, methods, and spec for serverless APIs on AWS.

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
    $ pulumi stack init aws-ts-apigateway-lambda-serverless
    ```

3.  Set the AWS region:

    ```bash
    $ pulumi config set aws:region us-east-2
    ```

4.  Restore NPM modules via `npm install` or `yarn install`.

## Deploy the App

1.  Run `pulumi up` to preview and deploy changes:

  ```bash
  `Updating (aws-ts-apigateway-lambda-serverless)

  View Live: https://app.pulumi.com/ajhool/aws-ts-apigateway-lambda-serverless/aws-ts-apigateway-lambda-serverless/updates/1

      Type                                Name                                                                     Status      
  +   pulumi:pulumi:Stack                 aws-ts-apigateway-lambda-serverless-aws-ts-apigateway-lambda-serverless  created     
  +   └─ aws:apigateway:x:API             hello-world                                                              created     
  +      ├─ aws:iam:Role                  hello-world40ecbb97                                                      created     
  +      ├─ aws:iam:Policy                hello-world2bb21f83-LambdaFullAccess                                     created     
  +      ├─ aws:iam:Role                  hello-world2bb21f83                                                      created     
  +      ├─ aws:iam:Role                  hello-world4fcc7b60                                                      created     
  +      ├─ aws:iam:Policy                hello-world40ecbb97-LambdaFullAccess                                     created     
  +      ├─ aws:iam:Policy                hello-world4fcc7b60-LambdaFullAccess                                     created     
  +      ├─ aws:lambda:Function           hello-world40ecbb97                                                      created     
  +      ├─ aws:lambda:Function           hello-world2bb21f83                                                      created     
  +      ├─ aws:iam:RolePolicyAttachment  hello-world2bb21f83-lambdaFullAccessCopyAttachment                       created     
  +      ├─ aws:iam:RolePolicyAttachment  hello-world40ecbb97-lambdaFullAccessCopyAttachment                       created     
  +      ├─ aws:lambda:Function           hello-world4fcc7b60                                                      created     
  +      ├─ aws:iam:RolePolicyAttachment  hello-world4fcc7b60-lambdaFullAccessCopyAttachment                       created     
  +      ├─ aws:apigateway:RestApi        hello-world                                                              created     
  +      ├─ aws:apigateway:Deployment     hello-world                                                              created     
  +      ├─ aws:lambda:Permission         hello-world-29d762f7                                                     created     
  +      ├─ aws:lambda:Permission         hello-world-86405973                                                     created     
  +      ├─ aws:lambda:Permission         hello-world-d21e9c98                                                     created     
  +      └─ aws:apigateway:Stage          hello-world                                                              created     
  
  Outputs:
      endpointUrl: "https://REDACTED.execute-api.us-east-2.amazonaws.com/stage/"

  Resources:
      + 20 created

  Duration: 36s`
  ```

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