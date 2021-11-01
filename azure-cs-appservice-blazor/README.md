[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure App Service with .net 6 Blazor Server

Starting point for building a .net 6 Blazor Server web application hosted in Azure App Service.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install .NET Core 6.0](https://dotnet.microsoft.com/download)

### Steps

1. Navigate to the BlazorApp.BlazorServer folder

    ```
    $ cd .\azure-cs-appservice-blazor\BlazorApp.BlazorServer\
    ```

2. Publish the Blazor application with `dotnet publish`

    ```
    $ dotnet publish
    ```

3. Navigate to the BlazorApp.Infrastructure folder

    ```
    $ cd ..\BlazorApp.Infrastructure
    ```

4. Create a new stack:

    ```
    $ pulumi stack init dev
    ```

5. Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

6. Configure the location to deploy the resources to:

    ```
    $ pulumi config set azure-native:location uksouth
    ```

7. Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...
    
    Performing changes:
    ...
    info: 7 changes performed:
        + 7 resources created
    Update duration: 53s
    ```

8. Check the deployed website endpoint (full output removed for brevity, you could also take the `AppServiceUrl` output and access it in a browser):

    ```
    $ pulumi stack output AppServiceUrl
    https://blazorserverappservice664d5c9b.azurewebsites.net
    $ curl "$(pulumi stack output AppServiceUrl)"
    StatusCode        : 200
    StatusDescription : OK
    Content           :
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="utf-8" />
                            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                            <title>BlazorApp.BlazorServer</title>
    ```

9. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

10. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
