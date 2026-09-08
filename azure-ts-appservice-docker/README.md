[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-appservice-docker/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-appservice-docker/README.md#gh-dark-mode-only)

# Azure App Service running Docker containers on Linux

Starting point for building web application hosted in Azure App Service from Docker images.

The example shows two scenarios:

- Deploying an existing image from Docker Hub
- Deploying a new custom registry in Azure Container Registry, building a custom Docker image, and running the image from the custom registry

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

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

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):
    ...
    Resources:
        + 8 created
    Duration: 56s
    ```

1.  Check the deployed endpoints:

    ```bash
    pulumi stack output HelloEndpoint
    curl "$(pulumi stack output HelloEndpoint)"
    pulumi stack output GetStartedEndpoint
    curl "$(pulumi stack output GetStartedEndpoint)"
    ```

    ```
    http://hello-app-91dfea.azurewebsites.net/hello
    Hello, world!

    http://get-started-15da13.azurewebsites.net
    <html>
    <body>
    <h1>Your custom docker image is running in Azure App Service!</h1>
    </body>
    </html>
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
