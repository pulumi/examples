[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-functions/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-functions/README.md#gh-dark-mode-only)

# Azure Functions on a Linux App Service plan

Azure Functions created from deployment packages in Python and deployed to an App Service Plan on Linux.

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

1.  Configure the location to deploy the resources to:

    ```bash
    pulumi config set azure-native:location westus2
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Previewing update (dev):
    ...

    Updating (dev):
    ...
    Resources:
        + 8 created
    Duration: 2m42s
    ```

1.  Check the deployed function endpoints:

    ```bash
    pulumi stack output Endpoint
    curl "$(pulumi stack output Endpoint)"
    ```

    ```
    https://app1a2d3e4d.azurewebsites.net/api/Hello?name=Pulumi
    Hello, Pulumi
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

## Cleaning up

Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
