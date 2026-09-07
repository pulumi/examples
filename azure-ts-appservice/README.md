[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-appservice/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-appservice/README.md#gh-dark-mode-only)

# Azure App Service with SQL Database and Application Insights

Starting point for building web application hosted in Azure App Service.

Provisions Azure SQL Database and Azure Application Insights to be used in combination
with App Service.

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

1.  Define the SQL Server password (make it complex enough to satisfy Azure policy):

    ```bash
    pulumi config set --secret sqlPassword <value>
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
        + 10 created
    Duration: 1m14s
    ```

1.  Check the deployed website endpoint:

    ```bash
    pulumi stack output endpoint
    curl "$(pulumi stack output endpoint)"
    ```

    ```
    https://azpulumi-as0ef47193.azurewebsites.net
    <html>
        <body>
            <h1>Greetings from Azure App Service (courtesy of Pulumi)!</h1>
        </body>
    </html>
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
