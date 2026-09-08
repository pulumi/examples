[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-redshift-glue-etl/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-redshift-glue-etl/README.md#gh-dark-mode-only)

# ETL pipeline with Amazon Redshift and AWS Glue

This example creates an ETL pipeline using Amazon Redshift and AWS Glue. The pipeline extracts data from an S3 bucket with a Glue crawler, transforms it with a Python script wrapped in a Glue job, and loads it into a Redshift database deployed in a VPC.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

1. In a few moments, the Redshift cluster and Glue components will be up and running and the S3 bucket name emitted as a Pulumi [stack output](https://www.pulumi.com/docs/intro/concepts/stack/#outputs):

    ```
    Outputs:
        dataBucketName: "events-56e424a"
    ```

1. Upload the included sample data file to S3 to verify the automation works as expected:

    ```bash
    aws s3 cp events-1.txt s3://$(pulumi stack output dataBucketName)
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
