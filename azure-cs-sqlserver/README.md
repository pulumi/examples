[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-sqlserver/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-sqlserver/README.md#gh-dark-mode-only)

# A SQLServer on Azure PaaS

This example configures [An example of a SQLServer on Azure PaaS](https://docs.microsoft.com/en-us/azure/azure-sql/database/logical-servers).

In addition to the server itself, a database is configured

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```
1. Set the Azure region location to use:

    ```
    $ pulumi config set azure-native:location westus
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 5 created
    Duration: 3m16s
    ```

1.  Check the deployed sql server and database
