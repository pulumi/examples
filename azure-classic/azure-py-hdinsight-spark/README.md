[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Spark on Azure HDInsight

An example Pulumi component that deploys a Spark cluster on Azure HDInsight.

## Running the App

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1. Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    $ az login
    ```

1. Specify the Azure location to use:

    ```bash
    $ pulumi config set azure:location WestUS
    ```

1. Define Spark username and password (make it complex enough to satisfy Azure policy):

    ```bash
    $ pulumi config set username <value>
    $ pulumi config set --secret password <value>
    ```

1. Run `pulumi up` to preview and deploy changes:

    ``` bash
    $ pulumi up
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
    $ pulumi stack output endpoint
    https://myspark1234abcd.azurehdinsight.net/

    # For instance, Jupyter notebooks are available at https://myspark1234abcd.azurehdinsight.net/jupyter/
    # Follow https://docs.microsoft.com/en-us/azure/hdinsight/spark/apache-spark-load-data-run-query to test it out
    ```
