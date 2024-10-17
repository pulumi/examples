[![Deploy this example with Pulumi](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-appservice-devops/infra/index.ts#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-appservice-devops/infra/index.ts#gh-dark-mode-only)

# Todo App Using Azure App Service with SQL Database and Integrated with Azure DevOps

A Todo List application from Azure Samples GitHub: [.NET Core MVC sample for Azure App Service](https://github.com/azure-samples/dotnetcore-sqldb-tutorial), a web app built with ASP.NET Core, Entity Framework Core and a SQL database.

Provisions Azure SQL Database and Azure Application Insights to be used in combination with App Service. Defines an Azure DevOps pipeline to deploy in CI/CD environment.

## Running the App manually with Pulumi CLI

1. Build and publish the ASP.NET Core project:

    ```bash
    dotnet publish src
    ```

1. Navigate to `infra`:

    ```bash
    cd infra
    ```

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Restore NPM dependencies:

    ```bash
    npm install
    ```

1. Configure target Azure environment:

    ```bash
    pulumi config set azure:location <location>
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    ```

1. Define SQL Server username:

    ```bash
    pulumi config set sqlUsername <value>
    ```

1. Define SQL Server password (make it complex enough to satisfy Azure policy):

    ```bash
    pulumi config set --secret sqlPassword <value>
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```console
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 10 changes performed:
        + 10 resources created
    Update duration: 1m14.59910109s
    ```

1. Check the deployed website endpoint:

    ```console
    $ pulumi stack output endpoint
    https://dev-as10d706a2.azurewebsites.net
    $ curl "$(pulumi stack output endpoint)"
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Index - My ToDoList App</title>
    ...
    ```

## Integrating with Azure DevOps

`azure-pipeline.yml` in the root folder of this example shows a configuration for Azure DevOps using [Pulumi task](https://marketplace.visualstudio.com/items?itemName=pulumi.build-and-release-task).

Pulumi task expects a Pulumi access token to be configured as a build variable. Copy your token from [Access Tokens page](https://app.pulumi.com/account/tokens) and put it into `pulumi.access.token` build variable.

`alternative-pipeline` folder contains custom scripts and a pipeline to run Pulumi program in environments that have to access to the marketplace.

Follow [Azure DevOps](https://www.pulumi.com/docs/guides/continuous-delivery/azure-devops/) guide for more details.
