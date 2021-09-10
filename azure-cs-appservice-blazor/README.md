[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure App Service with .net 6 Blazor Server

Starting point for building a .net 6 Blazor Server web application hosted in Azure App Service.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install .NET Core 6.0](https://dotnet.microsoft.com/download)

### Steps

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
    $ pulumi config set azure-native:location uksouth
    ```

4. Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...
    
    Performing changes:
    ...
    info: TO DO changes performed:
        + TO DO resources created
    Update duration: 1m14.59910109s
    ```

1.  Check the deployed website endpoint:

    ```
    $ pulumi stack output Endpoint
    https://azpulumi-as0ef47193.azurewebsites.net
    $ curl "$(pulumi stack output Endpoint)"
    <html>
        <body>
            <h1>Greetings from Azure App Service (courtesy of Pulumi)!</h1>
        </body>
    </html>
    ```

6. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

7. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
