[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-containerapps/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-containerapps/README.md#gh-dark-mode-only)

# Azure Container Apps

Starting point for building a web application hosted in Azure Container Apps. This example builds a custom Docker image, pushes it to an Azure Container Registry, and deploys it to an Azure Container App.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)
4. [Install Docker](https://docs.docker.com/get-docker/)

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
        + 7 created

    Duration: 4m18s
    ```

1. Check the deployed endpoint:

    ```bash
    curl "$(pulumi stack output url)"
    ```

    ```
    <html>
    <body>
    <h1>Your custom docker image is running in Azure Container Apps!</h1>
    </body>
    </html>
    ```

## Cleaning up

Once you are finished, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
