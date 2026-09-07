[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-airflow/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-airflow/README.md#gh-dark-mode-only)

# RDS Postgres and containerized Airflow

A Pulumi program to deploy an RDS Postgres instance and containerized Airflow.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init airflow
    ```

1. Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1. Set the desired RDS password:

    ```bash
    pulumi config set --secret airflow:dbPassword DESIREDPASSWORD
    ```

1. Install dependencies:

    ```bash
    npm install
    ```

1. Deploy the stack. After the preview is shown you will be prompted whether to continue or not.

    ```bash
    pulumi up
    ```

    ```
    Previewing update of stack 'airflow'
    Previewing changes:

         Type                                           Name                              Plan       Info
     +   pulumi:pulumi:Stack                            airflow                           create
    ...
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
