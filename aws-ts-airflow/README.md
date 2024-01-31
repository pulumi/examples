[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-airflow/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-airflow/README.md#gh-dark-mode-only)

# RDS Postgres and Containerized Airflow

A Pulumi program to deploy an RDS Postgres instance and containerized Airflow.

## Deploying and running the program

For more information on how to run this example, see: https://www.pulumi.com/docs/ and https://www.pulumi.com/docs/get-started/

1. Create a new stack:

   ```bash
   $ pulumi stack init airflow
   ```

1. Set the AWS region:

    ```
    $ pulumi config set aws:region us-east-1
    ```

1. Set the desired RDS password with:

    ```
    $ pulumi config set --secret airflow:dbPassword DESIREDPASSWORD
    ```

1. Restore NPM modules via `yarn install`.
1. Run `pulumi up` to preview and deploy changes.  After the preview is shown you will be
   prompted if you want to continue or not.

```
Previewing update of stack 'airflow'
Previewing changes:

     Type                                           Name                              Plan       Info
 +   pulumi:pulumi:Stack                            airflow                           create
...
```
