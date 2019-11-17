[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Bot Service with Application Insights

Starting point for building Azure Bot Service hosted in Azure App Service.

Provisions Azure Bot Service, Azure Bot Channel registration and Azure Application Insights to be used in combination
with App Service - registering Azure AD Microsoft Application with secret.  This will deploy the echo bot within the ~/bot/bot.zip file - you can replace the contents with your own bot.  Simply publish the bot to a local folder, zipping the contents and replacing this file.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

* [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Install .NET Core 3.0+](https://dotnet.microsoft.com/download)

### Steps

1.  Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

2.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    $ az login
    ```

3.  Configure the location to deploy the resources to:

    ```bash
    $ pulumi config set azure:location "North Europe"
    ```

4.  Configure the Bot Name:

    ```bash
    $ pulumi config set botName "PulumiBot1"
    ```

5.  Configure the MS AD Application Secret (ensure this is complex enough eg. 16 characters long and contain at least 1 numeric and special character):

    ```bash
	$ pulumi config set botSecret "MySuperS3cr3tPassword:)" --secret
    ```

6.  Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 13 changes performed:
        + 13 resources created
    Update duration: 1m22s
    ```

7.  Check the deployed bot using either:
  
   * Azure Portal Azure Bot Service - [Test in Webchat feature](https://docs.microsoft.com/en-us/azure/bot-service/abs-quickstart?view=azure-bot-service-4.0#test-the-bot)
   * [Bot Framework Emulator](https://github.com/Microsoft/BotFramework-Emulator) pointing to the output bot endpoint and Microsoft Application Id and the secret you supplied:

      ```bash
      $ Bot Endpoint: "https://app8asdf.azurewebsites.net/api/messages"
      $ MicrosoftAppId: "b5e65403-923c-4568-z2f6-a6f41b258azz"
      $ Secret: "MySuperS3cr3tPassword:)"    
      ```

8.  Once you've finished, you can tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy -y
    $ pulumi stack rm -y
    ```
