[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-call-azure-api/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-call-azure-api/README.md#gh-dark-mode-only)

# Demo of integrating the native Azure Pulumi provider with the Microsoft Azure SDK

The native Azure Pulumi provider exposes the entire resource model of Azure Resource Manager. Each resource can be created, updated, deleted, or refreshed (read).

However, Azure API has many endpoints that don't map to our resource model. For examples, finding resources given some filter criteria is not supported directly.

You can easily integrate an Azure SDK call or a raw HTTP request inside your Pulumi program using the same programming language. We provide a helper function `Authorization.GetClientToken()` that returns a valid authentication token for the same login context that the Pulumi provider is using.

This example demonstrates how to use such integration to lookup a role definition ID based on its name and scope. It then creates a role assignment for the resulting definition to allow pulling container images from a registry.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

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
    ...
    Resources:
        ~ 1 updated
        3 unchanged
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
