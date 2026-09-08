[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-serverless-url-shortener-global/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-serverless-url-shortener-global/README.md#gh-dark-mode-only)

# Globally distributed serverless URL shortener using Azure Functions and Cosmos DB

Multi-region deployment of Azure Functions and Cosmos DB with Traffic Manager.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Specify the Azure subscription and regions to deploy the application:

    ```bash
    pulumi config set locations westus,westeurope
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
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
    info: 23 changes performed:
        + 23 resources created
    Update duration: 21m33.3252322s
    ```

1. Add a short URL:

    ```bash
    pulumi stack output addEndpoint
    curl -H "Content-Type: application/json" \
        --request POST \
        -d '{"id":"pulumi","url":"https://pulumi.com"}' \
        "$(pulumi stack output addEndpoint)"
    ```

    ```
    https://urlshort-add94ac80f8.azurewebsites.net/api/urlshort-add
    Short URL saved
    ```

1. Query a short URL:

    ```bash
    pulumi stack output endpoint
    curl -L $(pulumi stack output endpoint)pulumi
    ```

    ```
    http://urlshort-tm.trafficmanager.net/api/
    <!doctype html>
    <html lang="en-US" prefix="og: http://ogp.me/ns#">
        <head>
        <title>
            Pulumi
        </title>
    ...
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
