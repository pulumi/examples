[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Deploy two App Services - Front web app with VNet injection and Back web app with a Private Endpoint

**Note** This is a port of https://github.com/Azure/azure-quickstart-templates/tree/master/101-webapp-privateendpoint-vnet-injection to Pulumi's Azure-Nextgen SDK.


This deploys a secure front end - back end web app. The front end web app is plugged in a subnet with the feature regional VNet integration enabled. Settings are set to consume a DNS private zone. The backend web app is only exposed through a private endpoint.

It will create a VNet, two subnets, one where your Private Endpoint will exist, the second where you will inject the front web app, an App Service Plan in PremiumV2 tier (mandatory for Private Endpoint), a Private Endpoint, settings for DNS queries to the DNS Private Zone, and a private DNS zone with record for the Private Endpoint.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install node.js](https://nodejs.org/en/download/)
3. [Configure Azure Credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)


### Optional config params
1. `resourceGroupName` - name for the resource group (defaults to `webapp-pvtendpoint-vnet-injection`)
1. `location` - location to create all resources (defaults to `westus2`)
1. `virtualNetworkCIDR` - CIDR range for the vnet (defaults to `10.200.0.0/16`)
1. `backendCIDR` - subnet CIDR range for the backend (defaults to `10.200.1.0/24`)
1. `frontendCIDR` - subnet CIDR range for the frontend (defaults to `10.200.2.0/24`)

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