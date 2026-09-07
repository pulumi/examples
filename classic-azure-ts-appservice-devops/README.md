[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/classic-azure-ts-appservice-devops/infra#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/classic-azure-ts-appservice-devops/infra#gh-dark-mode-only)

# Todo app using Azure App Service with SQL Database integrated with Azure DevOps

A Todo List application from Azure Samples GitHub: [.NET Core MVC sample for Azure App Service](https://github.com/azure-samples/dotnetcore-sqldb-tutorial), a web app built with ASP.NET Core, Entity Framework Core and a SQL database.

Provisions Azure SQL Database and Azure Application Insights to be used in combination with App Service. Defines an Azure DevOps pipeline to deploy in a CI/CD environment.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

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

1. Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Configure the target Azure environment:

    ```bash
    pulumi config set azure:location <location>
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    ```

1. Define the SQL Server username:

    ```bash
    pulumi config set sqlUsername <value>
    ```

1. Define the SQL Server password (make it complex enough to satisfy Azure policy):

    ```bash
    pulumi config set --secret sqlPassword <value>
    ```

1. Install dependencies:

    ```bash
    npm install
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 10 changes performed:
        + 10 resources created
    Update duration: 1m14.59910109s
    ```

1. Check the deployed website endpoint:

    ```bash
    pulumi stack output endpoint
    curl "$(pulumi stack output endpoint)"
    ```

    ```
    https://dev-as10d706a2.azurewebsites.net
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Index - My ToDoList App</title>
    ...
    ```

## Integrating with Azure DevOps

`azure-pipeline.yml` in the root folder of this example shows a configuration for Azure DevOps using the [Pulumi task](https://marketplace.visualstudio.com/items?itemName=pulumi.build-and-release-task).

The Pulumi task expects a Pulumi access token to be configured as a build variable. Copy your token from the [Access Tokens page](https://app.pulumi.com/account/tokens) and put it into the `pulumi.access.token` build variable.

The `alternative-pipeline` folder contains custom scripts and a pipeline to run the Pulumi program in environments that do not have access to the marketplace.

Follow the [Azure DevOps](https://www.pulumi.com/docs/guides/continuous-delivery/azure-devops/) guide for more details.

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
