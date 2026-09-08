[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-yaml-container-apps/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-yaml-container-apps/README.md#gh-dark-mode-only)

# Azure Container Apps

Starting point for building web application hosted in Azure Container Apps.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1.  Set the Azure region to deploy into:

    ```bash
    pulumi config set azure-native:location westus2
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 7 created

    Duration: 4m18s
    ```

1.  Check the deployed endpoint:

    ```bash
    curl "$(pulumi stack output endpoint)"
    ```

    ```
    <html>
    <body>
    <h1>Your custom docker image is running in Azure Container Apps!</h1>
    </body>
    </html>
    ```

## Cleaning up

Once you're finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
