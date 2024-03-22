# ETL pipeline with Amazon Redshift and AWS Glue

[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-redshift-glue-etl/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-redshift-glue-etl/README.md#gh-dark-mode-only)

This example creates an ETL pipeline using Amazon Redshift and AWS Glue. The pipeline extracts data from an S3 bucket with a Glue crawler, transforms it with a Python script wrapped in a Glue job, and loads it into a Redshift database deployed in a VPC.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/).
1. [Install Python](https://www.pulumi.com/docs/intro/languages/python/).
1. Configure your [AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/).

### Deploying the App

1. Clone this repo, change to this directory, then create a new [stack](https://www.pulumi.com/docs/intro/concepts/stack/) for the project:

    ```bash
    pulumi stack init
    ```

1. Specify an AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1. Install Python dependencies and run Pulumi:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt

    pulumi up
    ```

1. In a few moments, the Redshift cluster and Glue components will be up and running and the S3 bucket name emitted as a Pulumi [stack output](https://www.pulumi.com/docs/intro/concepts/stack/#outputs).

    ```bash
    ...
    Outputs:
        dataBucketName: "events-56e424a"
    ```

1. Upload the included sample data file to S3 to verify the automation works as expected:

    ```bash
    aws s3 cp events-1.txt s3://$(pulumi stack output dataBucketName)
    ```

1. When you're ready, destroy your stack and remove it:

    ```bash
    pulumi destroy --yes
    pulumi stack rm --yes
    ```
