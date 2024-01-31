[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-cs-webserver/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-cs-webserver/README.md#gh-dark-mode-only)

# Web Server Using Azure Virtual Machine

This example deploys an Azure Virtual Machine and starts a HTTP server on it.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install .NET Core 3.0+](https://dotnet.microsoft.com/download)

### Steps

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1. Set an appropriate Azure location like:

    ```
    $ pulumi config set azure:location westus
    ```

1. Run `pulumi up` to preview and deploy the changes:

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...

    7 resources created
    ```

1. Get the IP address of the newly-created instance from the stack's outputs:

    ```
    $ pulumi stack output IpAddress
    137.117.15.111
    ```

1. Check to see that your server is now running:

    ```
    $ curl http://$(pulumi stack output IpAddress)
    Hello, World!
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
