[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-java-appservice-sql/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-java-appservice-sql/README.md#gh-dark-mode-only)

# Azure App Service with SQL Database and Application Insights

Starting point for building web application hosted in Azure App Service.

Provisions Azure SQL Database and Azure Application Insights to be used in combination with App Service.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1. Set the Azure region location and sql password to use:

    ```
    $ pulumi config set azure-native:location westus
    $ pulumi config set azure-java-appservice-sql:sqlPassword <value> --secret
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 9 created
    Duration: 2m52s
    ```

1.  Check the deployed website endpoint:

    ```
    $ pulumi stack output endpoint
    https://websitesbc90978a1.z20.web.core.windows.net/
    $ curl "$(pulumi stack output endpoint)"
    <html>
        <body>
            <h1>This file is served from Blob Storage (courtesy of Pulumi!)</h1>
        </body>
    </html>
    ```
