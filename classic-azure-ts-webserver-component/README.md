[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-webserver-component/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-webserver-component/README.md#gh-dark-mode-only)

# Web server component using Azure Virtual Machine

This example provisions a configurable number of Linux web servers in an Azure Virtual Machine, and returns the
resulting public IP addresses. This example uses a reusable [Pulumi component](
https://www.pulumi.com/docs/intro/concepts/resources/#components) to simplify the creation of new virtual machines. By
defining a `WebServer` class, we can hide many details (see [here](./webserver.ts) for its definition).

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Configure the deployment. The username and password here will be used to configure the Virtual Machine. The
    password must adhere to the [Azure restrictions on VM passwords](
    https://docs.microsoft.com/en-us/azure/virtual-machines/windows/faq#what-are-the-password-requirements-when-creating-a-vm).
    Note that `--secret` ensures your password is encrypted safely.

    ```bash
    pulumi config set azure:location westus  # any valid Azure region will do
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    pulumi config set username webmaster
    pulumi config set password <your-password> --secret
    pulumi config set count 5                # optional -- will default to 2 if left out
    ```

1. Install dependencies:

    ```bash
    npm install
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
    info: 15 changes performed:
        + 15 resources created
    Update duration: 4m27s
    ```

1. Check the resulting IP addresses:

    ```bash
    pulumi stack output ipAddresses
    ```

    ```
    [ 40.112.181.239, ..., 40.112.181.240 ]
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
