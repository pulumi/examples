[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-fs-aci/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-fs-aci/README.md#gh-dark-mode-only)

# Custom Docker Image running in Azure Container Instances

Starting point for building web application hosted in Azure Container Instances.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install .NET Core 3.0+](https://dotnet.microsoft.com/download)

### Steps

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Configure the location to deploy the resources to:

    ```bash
    pulumi config set azure:location <location>
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```console
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 55 changes performed:
        + 10 resources created
    Update duration: 1m56s
    ```

1. Check the deployed container endpoint:

    ```console
    $ pulumi stack output endpoint
    https://acifsharp.westeurope.azurecontainer.io
    $ curl "$(pulumi stack output endpoint)"
    <html>
    <head><meta charset="UTF-8">
    <title>Hello, Pulumi!</title></head>
    <body>
        <p>Hello, containers!</p>
        <p>Made with ❤️ with <a href="https://pulumi.com">Pulumi</a></p>
    </body></html>
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    pulumi destroy --yes
    pulumi stack rm --yes
    ```
