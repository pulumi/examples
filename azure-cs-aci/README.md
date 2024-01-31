[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aci/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aci/README.md#gh-dark-mode-only)

# Azure Container Instances on Linux

Starting point for building web application hosted in Azure Container Instances.

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
    $ pulumi config set azure-native:location westus2
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:

        Type                                              Name              Status
    +   pulumi:pulumi:Stack                               azure-cs-aci-dev  created
    +   ├─ azure-native:resources:ResourceGroup           aci-rg            created
    +   └─ azure-native:containerinstance:ContainerGroup  helloworld        created

    Outputs:
        containerIPv4Address: "20.56.239.40"

    Resources:
        + 3 created

    Duration: 1m18s
    ```

1.  Check the deployed endpoints:

    ```
    $ pulumi stack output containerIPv4Address
    13.83.66.37
    $ curl "$(pulumi stack output containerIPv4Address)"
    <html>
    <head>
        <title>Welcome to Azure Container Instances!</title>
    </head>
    ...
    ```
