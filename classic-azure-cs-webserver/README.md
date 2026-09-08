[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-cs-webserver/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-cs-webserver/README.md#gh-dark-mode-only)

# Web server using Azure Virtual Machine

This example deploys an Azure Virtual Machine and starts a HTTP server on it.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Set the location to deploy the resources to and the Azure subscription:

    ```bash
    pulumi config set azure:location westus
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Previewing changes:
    ...

    Performing changes:
    ...

    7 resources created
    ```

1. Get the IP address of the newly-created instance from the stack's outputs:

    ```bash
    pulumi stack output IpAddress
    ```

    ```
    137.117.15.111
    ```

1. Check to see that your server is now running:

    ```bash
    curl http://$(pulumi stack output IpAddress)
    ```

    ```
    Hello, World!
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

## Cleaning up

Once you're finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
