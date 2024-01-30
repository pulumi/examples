[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-cosmosapp-component/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-cosmosapp-component/README.md#gh-dark-mode-only)

# Reusable Component to Create Globally-distributed Applications with Azure Cosmos DB

This example demonstrates the usage of Pulumi to create globally-distributed applications with Azure Cosmos DB as the backend and pluggable infrastrustructure as the web tier.

The application shows several notable features:

1. Easy global deployments - a config setting provides a list of all the regions to deploy and a single execution deploys across them all.
2. Abstraction - the `CosmosApp` component - abstracts away all the common logic for a global app with Cosmos DB multi-region data distribution and Traffic Manager for routing the traffic.
3. Multi-model - examples are provided for serverless functions, containers, and virtual machines, all fitting to the above abstraction.

## `CosmosApp` component

The [`CosmosApp`](cosmosApp.ts) defines a skeleton for the application. While not limiting the type of compute resources, it creates the multi-regional pieces of the infrastructure:

![Cosmos App](https://github.com/mikhailshilkov/pulumi-cosmos/raw/master/pictures/globalapp.png)

The application has three example of using this component with the following compute services:

- Azure Functions
- Azure Container Instances
- Azure VM Scale Sets + Azure Load Balancer

## Prerequisites

1.  [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1.  [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)

## Steps

### Step 1: Create a new stack

```
$ pulumi stack init dev
```

### Step 2: Log in to the Azure CLI

You will be prompted to do this during deployment if you forget this step.

```
$ az login
```

### Step 3: Install NPM dependencies

```
$ npm install
```

### Step 4: Deploy your changes

Run `pulumi up` to preview and deploy changes:

```
$ pulumi up
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

### Step 5: Check the deployed website endpoints

Three endpoints are now available. For example,

```
$ pulumi stack output functionsEndpoint
http://functionscosmosfunc-rgcc15ea50.trafficmanager.net/api/cosmos

$ curl "$(pulumi stack output functionsEndpoint)"
Document 'cosmos' not found
```

Go to the Azure portal and add a document with the ID "cosmos" to receive a non-empty response.

## Running Unit Tests

The `unittests.ts` file contains two sample unit tests that can be run with Mocha:

```
mocha -r ts-node/register unittests.ts
```

## Running Policy Pack

The `policy` folder contains two sample policies that can be applied with the `policy-pack` argument:

```
pulumi up --policy-pack policy
```
