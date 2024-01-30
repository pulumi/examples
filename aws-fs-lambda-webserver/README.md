[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-fs-lambda-webserver/pulumi/Program.fs#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-fs-lambda-webserver/pulumi/Program.fs#gh-dark-mode-only)

# AWS F# Lambda Web Server
This example creates a web server in AWS lambda using the Giraffe web server

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Build and publish the lambda function, making the output available to our Pulumi program.

```bash
dotnet publish ./LambdaWebServer
```

2. Execute our Pulumi program to archive our published function output, and create our lambda.
```bash
pulumi up -C ./pulumi
```

3. In a browser, navigate to the URL for `websiteUrl`. You should see the welcome message.
