[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-serverless-url-shortener-global/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-serverless-url-shortener-global/README.md#gh-dark-mode-only)

# Globally Distributed Serverless URL Shortener Using Azure Functions and Cosmos DB

Multi-region deployment of Azure Functions and Cosmos DB with Traffic Manager

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

1.  Specify the Azure regions to deploy the application:

    ```
    $ pulumi config set locations westus,westeurope
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 23 changes performed:
        + 23 resources created
    Update duration: 21m33.3252322s
    ```

1.  Add a short URL:

    ```
    $ pulumi stack output addEndpoint
    https://urlshort-add94ac80f8.azurewebsites.net/api/urlshort-add
    $ curl -H "Content-Type: application/json" \
        --request POST \
        -d '{"id":"pulumi","url":"https://pulumi.com"}' \
        "$(pulumi stack output addEndpoint)"
    Short URL saved
    ```

1.  Query a short URL:

    ```
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
