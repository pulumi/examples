[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-sqlserver-privateendpoint-vnet-injection/README.md)

# A SQLServer on Azure PaaS secured using a private endpoint

This example configures [An example of a SQLServer on Azure PaaS connected to a subnet using a private endpoint](https://docs.microsoft.com/en-us/azure/private-link/private-endpoint-overview).

In addition to the server itself, a database is configured
The server is not exposed to the internet and to connect to it you have to use a ressource in the subnet.
A private DNS Zone is configured to point the server record to the private IP (servername.database.windows.net)

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
        + 12 created
    Duration: 5m16s
    ```

1.  Check the deployed sql server and the private endpoint configuration.
