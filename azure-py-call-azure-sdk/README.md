[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-call-azure-sdk/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-call-azure-sdk/README.md#gh-dark-mode-only)

# Demo of Integrating the native Azure Pulumi provider with the Microsoft Azure SDK

The native Azure Pulumi provider exposes the entire resource model of Azure Resource Manager. Each resource can be created, updated, deleted, or refreshed (read).

However, Azure API has many endpoints that don't map to our resource model. For examples, finding resources given some filter criteria is not supported directly.

However, you can easily integrate an Azure SDK call inside your Pulumi program using the same programming language. We provide a helper function `authorization.get_client_token()` that returns a valid authentication token for the same login context that the Pulumi provider is using.

This example demonstrates how to use such integration to lookup a role definition ID based on its name and scope. It then creates a role assignment for the resulting definition to allow pulling container images from a registry.

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
    $ pulumi config set azure-native:location WestUS
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...
    Performing changes:
    ...
    Resources:
       + 4 created
    ```
