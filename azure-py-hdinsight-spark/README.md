[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

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

1.  Create a Python virtualenv, activate it, and install dependencies:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```
    $ virtualenv -p python3 venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
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
