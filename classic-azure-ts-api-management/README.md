[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-api-management/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-api-management/README.md#gh-dark-mode-only)

# Azure API Management

An example Pulumi program that deploys an instance of Azure API Management with the following resources:

- API which is linked to an Azure Function App backend
- Operation and operation policy with URL rewrite and caching rules
- A product, a user, and a subscription to enable access to the API

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

1. Configure the Azure environment:

    ```bash
    pulumi config set azure:location <location>
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
    Previewing update (dev):
    ...

    Updating (dev):
    ...
    Resources:
       + 12 created
    Duration: 34m54s
    ```

1. Check the deployed function endpoint:

    ```bash
    pulumi stack output endpoint
    curl --header "Ocp-Apim-Subscription-Key: $(pulumi stack output key)" $(pulumi stack output endpoint)
    ```

    ```
    https://greeting-service12345678.azure-api.net/hello/Pulumi
    {"time":"2019-06-17T15:16:08.227Z","greeting":"Hello Pulumi!"}
    ```

1. Verify that the API caches the response for 30 seconds -- the same time should be returned for subsequent queries:

    ```bash
    curl --header "Ocp-Apim-Subscription-Key: $(pulumi stack output key)" $(pulumi stack output endpoint)
    ```

    ```
    {"time":"2019-06-17T15:16:08.227Z","greeting":"Hello Pulumi!"}
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
