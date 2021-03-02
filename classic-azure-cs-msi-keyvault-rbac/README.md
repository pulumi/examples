[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Managing Secrets and Secure Access in Azure Applications

[Managed identities](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/) for Azure resources provides Azure services with an automatically managed identity in Azure Active Directory (Azure AD).

This example demonstrates using a managed identity with Azure App Service to access Azure KeyVault, Azure Storage, and Azure SQL Database without passwords or secrets.

The application consists of several parts:

- An ASP.NET Application which reads data from a SQL Database and from a file in Blob Storage
- App Service which host the application. The application binaries are placed in Blob Storage, with Blob Url placed as a secret in Azure Key Vault
- App Service has a Managed Identity enabled
- The identify is granted access to the SQL Server, Blob Storage, and Key Vault
- No secret information is placed in App Service configuration: all access rights are derived from Active Directory

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install .NET Core 3.0+](https://dotnet.microsoft.com/download)

### Steps

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Build and publish the ASP.NET Core project:

    ```
    $ dotnet publish webapp
    ```

1. Set an appropriate Azure location like:

    ```
    $ pulumi config set azure:location westus
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 15 changes performed:
        + 15 resources created
    Update duration: 4m16s
    ```

1.  Check the deployed website endpoint:

    ```
    $ pulumi stack output Endpoint
    https://app129968b8.azurewebsites.net/
    $ curl "$(pulumi stack output Endpoint)"
    Hello 311378b3-16b7-4889-a8d7-2eb77478beba@50f73f6a-e8e3-46b6-969c-bf026712a650! Here is your...
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
