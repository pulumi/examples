[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-yaml-app-service/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-yaml-app-service/README.md#gh-dark-mode-only)

# Azure App Service with SQL Database and Application Insights

Starting point for building web application hosted in Azure App Service.

Provisions Azure SQL Database and Azure Application Insights to be used in combination
with App Service.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)

### Steps

1.  Install required plugins:

    ```bash
    $ pulumi plugin install resource azure-native 1.56.0
    $ pulumi plugin install resource random 4.3.1
    ```

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Configure the location to deploy the resources to:

    ```
    $ pulumi config set azure-native:location centralus
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 11 changes performed:
        + 11 resources created
    Update duration: 1m14.59910109s
    ```

1.  Check the deployed website endpoint:

    ```
    $ pulumi stack output Endpoint
    https://azpulumi-as0ef47193.azurewebsites.net
    $ curl "$(pulumi stack output endpoint)"
    <html>

    <head>
        <meta charset="UTF-8">
        <title>Hello, Pulumi!</title>
        <link href="favicon.png" rel="icon" type="image/png" />
    </head>

    <body>
        <h1>Hello, Azure!</h1>
        <p>Made with ❤️ with <a href="https://pulumi.com">Pulumi</a></p>
        <p>This file is served from Azure App Service, via Blob Storage.</p>
    </body>

    </html>
    ```

6. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

7. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
