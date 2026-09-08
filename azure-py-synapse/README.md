[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-synapse/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-synapse/README.md#gh-dark-mode-only)

# Azure Synapse workspace and pools

Starting point for enterprise analytics solutions based on Azure Synapse. This example creates an Azure Synapse workspace with SQL and Spark pools.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Set the Azure region to deploy into:

    ```bash
    pulumi config set azure-native:location westus2
    ```

1. Set the user ID to grant access to (e.g., your current user):

    ```bash
    pulumi config set userObjectId $(az ad signed-in-user show --query=objectId | tr -d '"')
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Performing changes:
    ...
    Resources:
        + 13 created

    Duration: 10m53s
    ```

1. Navigate to https://web.azuresynapse.net and sign in to your new workspace.

## Cleaning up

Once you are finished, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
