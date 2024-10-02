[![Deploy this example with Pulumi](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-serverless-url-shortener-global/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-serverless-url-shortener-global/README.md#gh-dark-mode-only)

# Globally Distributed Serverless URL Shortener Using Azure Functions and Cosmos DB

Multi-region deployment of Azure Functions and Cosmos DB with Traffic Manager

## Running the App

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

1. Specify the Azure subscription and regions to deploy the application:

    ```bash
    pulumi config set locations westus,westeurope
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```console
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 23 changes performed:
        + 23 resources created
    Update duration: 21m33.3252322s
    ```

1. Add a short URL:

    ```console
    $ pulumi stack output addEndpoint
    https://urlshort-add94ac80f8.azurewebsites.net/api/urlshort-add
    $ curl -H "Content-Type: application/json" \
        --request POST \
        -d '{"id":"pulumi","url":"https://pulumi.com"}' \
        "$(pulumi stack output addEndpoint)"
    Short URL saved
    ```

1. Query a short URL:

    ```console
    $ pulumi stack output endpoint
    http://urlshort-tm.trafficmanager.net/api/
    $ curl -L $(pulumi stack output endpoint)pulumi
    <!doctype html>
    <html lang="en-US" prefix="og: http://ogp.me/ns#">
        <head>
        <title>
            Pulumi
        </title>
    ...
    ```
