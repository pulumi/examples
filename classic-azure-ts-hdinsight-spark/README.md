[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-hdinsight-spark/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-hdinsight-spark/README.md#gh-dark-mode-only)

# Spark on Azure HDInsight

An example Pulumi component that deploys a Spark cluster on Azure HDInsight.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 5 changes performed:
        + 5 resources created
    Update duration: 15m6s
    ```

1.  Check the deployed Spark endpoint:

    ```
    $ pulumi stack output endpoint
    https://myspark1234abcd.azurehdinsight.net/

    # For instance, Jupyter notebooks are available at https://myspark1234abcd.azurehdinsight.net/jupyter/
    # Follow https://docs.microsoft.com/en-us/azure/hdinsight/spark/apache-spark-load-data-run-query to test it out
    ```
