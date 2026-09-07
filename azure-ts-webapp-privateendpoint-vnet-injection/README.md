[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-webapp-privateendpoint-vnet-injection/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-webapp-privateendpoint-vnet-injection/README.md#gh-dark-mode-only)

# Two App Services: front web app with VNet injection and back web app with a private endpoint

This deploys a secure front end - back end web app. The front end web app is plugged in a subnet with the feature regional VNet integration enabled. Settings are set to consume a DNS private zone. The backend web app is only exposed through a private endpoint.

It will create a VNet, two subnets, one where your Private Endpoint will exist, the second where you will inject the front web app, an App Service Plan in PremiumV2 tier (mandatory for Private Endpoint), a Private Endpoint, settings for DNS queries to the DNS Private Zone, and a private DNS zone with record for the Private Endpoint.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1. Set the Azure region to deploy into:

    ```bash
    pulumi config set azure-native:location westus2
    ```

1. Optionally, override the default CIDR ranges:

    ```bash
    pulumi config set virtualNetworkCIDR 10.200.0.0/16   # CIDR range for the VNet
    pulumi config set backendCIDR 10.200.1.0/24          # subnet CIDR range for the backend
    pulumi config set frontendCIDR 10.200.2.0/24         # subnet CIDR range for the frontend
    ```

1. Install dependencies:

    ```bash
    npm install
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

## Cleaning up

Once you're finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
