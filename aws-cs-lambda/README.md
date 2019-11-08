# AWS C# Lambda
This example creates a lambda that does a simple `.toUpper` on the string input and returns it. 

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Build and publish the lambda function, making the output available to our Pulumi program. 

```bash
dotnet publish ./DotnetLambda/src/DotnetLambda/
```

2. Execute our Pulumi program to archive our published function output, and create our lambda. 
```bash
pulumi up -C ./pulumi
```

3. Call our lambda function from the aws cli.
```bash
aws lambda invoke \
--function-name $(pulumi stack output lambda -C ./pulumi) \
--region $(pulumi config get aws:region -C ./pulumi) \
--payload '"foo"' \
output.json

cat output.json # view the output file with your tool of choice
# "FOO"
```