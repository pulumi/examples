[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-api-management/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-api-management/README.md#gh-dark-mode-only)

# Azure API Management

An example Pulumi program that deploys an instance of Azure API Management with the following resources:

- API which is linked to an Azure Function App backend
- Operation and operation policy with URL rewrite and caching rules
- A product, a user, and a subscription to enable access to the API

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

1.  Configure Azure location:

    ```
    $ pulumi config set azure:location <location>
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (dev):
    ...

    Updating (dev):
    ...
    Resources:
       + 12 created
    Duration: 34m54s
    ```

1.  Check the deployed function endpoint:

    ```
    $ pulumi stack output endpoint
    https://greeting-service12345678.azure-api.net/hello/Pulumi
    $ curl --header "Ocp-Apim-Subscription-Key: $(pulumi stack output key)" $(pulumi stack output endpoint)
    {"time":"2019-06-17T15:16:08.227Z","greeting":"Hello Pulumi!"}
    ...
    ```

1.  Verify that API caches the response for 30 seconds - the same time should be returned for subsequent queries:

    ```
    $ curl --header "Ocp-Apim-Subscription-Key: $(pulumi stack output key)" $(pulumi stack output endpoint)
    {"time":"2019-06-17T15:16:08.227Z","greeting":"Hello Pulumi!"}
    ...
    ```
