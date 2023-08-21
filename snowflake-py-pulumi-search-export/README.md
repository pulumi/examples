# snowflake-py-pulumi-search-export

This folder contains an example to export search data from Pulumi Cloud to Snowflake. The infrastructure contains:

- An AWS Lambda function that queries the Pulumi Cloud REST API to [export search data](https://www.pulumi.com/docs/pulumi-cloud/cloud-rest-api/#resource-search) and places the file in an S3 bucket.

Trigger the Lambda with the following command:

```bash
aws lambda invoke --function-name $(pulumi stack output lambdaArn) /dev/stdout
```
