[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-credential-rotation-one-set/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-credential-rotation-one-set/README.md#gh-dark-mode-only)

# Automate the rotation of a secret for resources that use one set of authentication credentials

Modeled after [Microsoft ARM documentation](https://docs.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation)

This example demonstrates using a managed identity with Azure App Service to access Azure KeyVault, Azure Storage, and Azure SQL Database without passwords or secrets.

The application consists of several parts:

- A SQL Server to rotate credendials
- A KeyVault that stores the credentials of the SQL Server
- A KeyVault that is only accessible to the WebApp and Function (through Managed Identity)
- An Azure Function that generates a new secret and sets it in SQL Server and Key Vault
- An Azure WebApp that shows that the secret is changing and still accessible
- An EventGrid subscription to receive SecretNearExpiry events from KeyVault and, in turn, call the Azure Function

> **IMPORTANT**: For example purposes, new secrets are continually generated. Make sure to change the validityPeriod or destroy the stack when you are done.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure Credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1.  Build and publish the ASP.NET Core project:

    ```bash
    dotnet publish webapp
    ```

1.  Set the Azure region location to use:

    ```bash
    pulumi config set azure-native:location westus2
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

1.  Check the deployed website endpoint:

    ```bash
    pulumi stack output WebAppEndpoint
    Start-Process "$(pulumi stack output WebAppEndpoint)"
    ```

    ```
    https://app129968b8.azurewebsites.net/
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

## Cleaning up

Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
