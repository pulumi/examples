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
cd dotnetLambda/src/dotnetLambda/ && dotnet restore && dotnet build && dotnet publish && cd ../../../
```

2. Execute our Pulumi program to archive our published function output, and create our lambda. 
```bash
cd ./pulumi/ && pulumi up && cd ../
```

3. Call our lambda function from the aws cli.
```bash
aws lambda invoke \
--function-name $(pulumi stack output lambda) \
--region $(pulumi config get aws:region) \
--payload '"foo"' \
output.json

cat output.json
# "FOO"
```