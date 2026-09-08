[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aci/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aci/README.md#gh-dark-mode-only)

# Azure Container Instances on Linux

Starting point for building a web application hosted in Azure Container Instances.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Login to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1.  Set the Azure region location to use:

    ```bash
    pulumi config set azure-native:location westus2
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
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

1.  Check the deployed endpoint:

    ```bash
    pulumi stack output containerIPv4Address
    curl "$(pulumi stack output containerIPv4Address)"
    ```

    ```
    <html>
    <head>
        <title>Welcome to Azure Container Instances!</title>
    </head>
    ...
    ```

## Cleaning up

Once you're finished, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
