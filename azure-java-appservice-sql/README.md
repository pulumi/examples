[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-java-appservice-sql/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-java-appservice-sql/README.md#gh-dark-mode-only)

# Azure App Service with SQL Database and Application Insights

Starting point for building web application hosted in Azure App Service.

Provisions Azure SQL Database and Azure Application Insights to be used in combination with App Service.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Java](https://www.pulumi.com/docs/intro/languages/java/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1.  Set the Azure region location and SQL password to use:

    ```bash
    pulumi config set azure-native:location westus
    pulumi config set azure-java-appservice-sql:sqlPassword <value> --secret
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
        + 9 created
    Duration: 2m52s
    ```

1.  Check the deployed website endpoint:

    ```bash
    pulumi stack output endpoint
    curl "$(pulumi stack output endpoint)"
    ```

    ```
    https://websitesbc90978a1.z20.web.core.windows.net/
    <html>
        <body>
            <h1>This file is served from Blob Storage (courtesy of Pulumi!)</h1>
        </body>
    </html>
    ```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
