[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Deploy two App Services - Front web app with VNet injection and Back web app with a Private Endpoint

**Note** This is a port of https://github.com/Azure/azure-quickstart-templates/tree/master/101-webapp-privateendpoint-vnet-injection to Pulumi's Azure-Nextgen SDK.


This deploys a secure front end - back end web app. The front end web app (`site2`) is plugged in a subnet with the feature regional VNet integration enabled. Settings are set to consume a DNS private zone. The backend web app (`site1`) is only exposed through a private endpoint.

It will create a VNet, two subnets, one where your Private Endpoint will exist, the second where you will inject the front web app, an App Service Plan in PremiumV2 tier (mandatory for Private Endpoint), a Private Endpoint, settings for DNS queries to the DNS Private Zone, and a private DNS zone with record for the Private Endpoint.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install node.js](https://nodejs.org/en/download/)
3. [Configure Azure Credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)


### Required config params
`resourceGroupNameParam` - name for the resource group.

### Steps

After cloning this repo, from this working directory, run these commands:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init dev
    ```

1. Next, install the dependencies:

    ```bash
    $ npm install
    ```

1. Stand up the cluster by invoking pulumi
    ```bash
    $ pulumi up
    ```