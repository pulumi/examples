[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-dynamicresource/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-dynamicresource/README.md#gh-dark-mode-only)

# Azure CDN Custom Domain Dynamic Provider

## Prerequisites

Prior to running this example, ensure that the custom domain you will be adding to your CDN endpoint has a CNAME record in your domain registrar's DNS management portal. The dynamic provider will validate that the mapping exists and will fail the deployment if the CDN endpoint is not reachable through your custom domain.

## Usage

In order to create a custom domain, you must have first created a CDN profile and an endpoint in that profile. Once those are created, you can use the `CDNCustomDomainResource` just like any other resource.

Here's an example:

```ts
const cdnCustomDomainResource = new CDNCustomDomainResource("cdnCustomDomain", {
    // Ensure that there is a CNAME record for mycompany.com
    // pointing to my-cdn-endpoint.azureedge.net.
    // You would do that in your domain registrar's portal.
    customDomainHostName: "mycompany.com",
    customDomainName: "custom-domain",
    profileName: cdnProfileName,
    endpointName: cdnEndpointName,
    // This will enable HTTPS through Azure's one-click
    // automated certificate deployment.
    // The certificate is fully managed by Azure from provisioning
    // to automatic renewal at no additional cost to you.
    httpsEnabled: true,
    resourceGroupName: resourceGroupName
}, { parent: cdnEndpoint });
```

That's it! The dynamic provider will automatically use the underlying Azure provider's configuration to determine the credentials to your subscription. If it cannot find them through the Azure provider, it will also look at the following environment variables:

- `ARM_CLIENT_ID`
- `ARM_CLIENT_SECRET` // Make sure to store the value for this var as secret in your CI/CD system.
- `ARM_TENANT_ID`
- `ARM_SUBSCRIPTION_ID`

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init azure-cdn-custom-domain
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

    ...or if you prefer using `yarn`, then `yarn install`.

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    ...
    Update duration: ...
    ```

## Dynamic Providers

Learn more about dynamic providers [here](https://www.pulumi.com/docs/intro/concepts/resources/#dynamicproviders).

## Known Issues

If you get a 404 error when deleting a custom domain or a deserialization error `SyntaxError: Unexpected token o in JSON at position 1`, these were due to bugs in the older versions of the Azure nodeJS SDK. See https://github.com/Azure/azure-sdk-for-js/issues/2842 for more info. Ensure that you have the latest versions by running `npm list @azure/ms-rest-js @azure/ms-rest-azure-js`. The versions you should have are:
- `@azure/ms-rest-js` - 1.8.10
- `@azure/ms-rest-azure-js` - 1.3.7

If you do not have the latest versions, delete your `node_modules` folder and `package-lock.json` (or `yarn.lock` if you are using yarn) and run `npm install` (or `yarn install`) again.
