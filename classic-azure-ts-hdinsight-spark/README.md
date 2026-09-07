[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-hdinsight-spark/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-hdinsight-spark/README.md#gh-dark-mode-only)

# Spark on Azure HDInsight

An example Pulumi component that deploys a Spark cluster on Azure HDInsight.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Configure the target Azure environment:

    ```bash
    pulumi config set azure:location <location>
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    pulumi config set username <value>
    pulumi config set password --secret <value>
    ```

1. Install dependencies:

    ```bash
    npm install
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 5 changes performed:
        + 5 resources created
    Update duration: 15m6s
    ```

1. Check the deployed Spark endpoint:

    ```bash
    pulumi stack output endpoint
    ```

    ```
    https://myspark1234abcd.azurehdinsight.net/
    ```

    For instance, Jupyter notebooks are available at `https://myspark1234abcd.azurehdinsight.net/jupyter/`. Follow the [Apache Spark load data and run queries guide](https://docs.microsoft.com/en-us/azure/hdinsight/spark/apache-spark-load-data-run-query) to test it out.

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
