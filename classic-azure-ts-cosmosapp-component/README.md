[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-cosmosapp-component/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-cosmosapp-component/README.md#gh-dark-mode-only)

# Reusable component to create globally distributed applications with Azure Cosmos DB

This example demonstrates the usage of Pulumi to create globally-distributed applications with Azure Cosmos DB as the backend and pluggable infrastructure as the web tier.

The application shows several notable features:

1. Easy global deployments - a config setting provides a list of all the regions to deploy and a single execution deploys across them all.
2. Abstraction - the `CosmosApp` component - abstracts away all the common logic for a global app with Cosmos DB multi-region data distribution and Traffic Manager for routing the traffic.
3. Multi-model - examples are provided for serverless functions, containers, and virtual machines, all fitting to the above abstraction.

## The `CosmosApp` component

The [`CosmosApp`](cosmosApp.ts) defines a skeleton for the application. While not limiting the type of compute resources, it creates the multi-regional pieces of the infrastructure:

![Cosmos App](https://github.com/mikhailshilkov/pulumi-cosmos/raw/master/pictures/globalapp.png)

The application has three examples of using this component with the following compute services:

- Azure Functions
- Azure Container Instances
- Azure VM Scale Sets + Azure Load Balancer

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

1. Configure the target Azure environment:

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
    Previewing changes:
    +  azure-ts-cosmosapp-component-dev  create
    +  examples:azure:CosmosApp vms create
    +  azure:network:VirtualNetwork vnet-westeurope create
    +  azure:network:PublicIp pip-westeurope create
    +  azure:trafficmanager:Profile tmvms create
    +  azure:trafficmanager:Endpoint tmvmswesteurope create
    +  azure:cosmosdb:Account cosmos-vms
    ...
    ```

1. Check the deployed website endpoints. Three endpoints are now available. For example:

    ```bash
    pulumi stack output functionsEndpoint
    curl "$(pulumi stack output functionsEndpoint)"
    ```

    ```
    http://functionscosmosfunc-rgcc15ea50.trafficmanager.net/api/cosmos
    Document 'cosmos' not found
    ```

    Go to the Azure portal and add a document with the ID "cosmos" to receive a non-empty response.

## Running unit tests

The `unittests.ts` file contains two sample unit tests that can be run with Mocha:

```bash
mocha -r ts-node/register unittests.ts
```

## Running the policy pack

The `policy` folder contains two sample policies that can be applied with the `policy-pack` argument:

```bash
pulumi up --policy-pack policy
```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
