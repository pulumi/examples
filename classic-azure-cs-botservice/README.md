[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-cs-botservice/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-cs-botservice/README.md#gh-dark-mode-only)

# Azure Bot Service with Application Insights

Starting point for building Azure Bot Service hosted in Azure App Service.

Provisions Azure Bot Service, Azure Bot Channel registration and Azure Application Insights to be used in combination
with App Service - registering Azure AD Microsoft Application with secret.

This will deploy the echo bot code within the ~/bot directory - you can tweak the contents or replace the contents with your own bot.  Please ensure you publish the bot first to the ~/bot/publish subfolder - following the instructions for `Publish Bot Steps`.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

* [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Install .NET Core 3.0+](https://dotnet.microsoft.com/download)

### Publish Bot Steps

1. Within the **/bot** subfolder, publish the bot to subfolder called publish:

    ```bash
    dotnet publish -o publish
    ```

### Pulumi Steps

1. Within the **azure-cs-botservice** folder, create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Configure the location to deploy the resources to:

    ```bash
    pulumi config set azure:location "North Europe"
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    ```

1. Configure the Bot Name:

    ```bash
    pulumi config set botName PulumiBot1
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```console
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 14 changes performed:
        + 14 resources created
    Update duration: 1m22s
    ```

1. Check the deployed bot using either:

    * Azure Portal Azure Bot Service - [Test in Webchat feature](https://docs.microsoft.com/en-us/azure/bot-service/abs-quickstart?view=azure-bot-service-4.0#test-the-bot)
    * [Bot Framework Emulator](https://github.com/Microsoft/BotFramework-Emulator) pointing to the output bot endpoint and Microsoft Application Id and the secret you supplied:

        ```yaml
        BotEndpoint: "https://app8asdf.azurewebsites.net/api/messages"
        MicrosoftAppId: "b5e65403-923c-4568-z2f6-a6f41b258azz"
        MicrosoftAppPassword: "<secret>"
        ```

1. Once you've finished, you can tear down your stack's resources by destroying and removing it:

    ```bash
    pulumi destroy -y
    pulumi stack rm -y
    ```
