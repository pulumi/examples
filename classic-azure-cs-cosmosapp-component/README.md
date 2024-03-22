[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-cs-cosmosapp-component/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-cs-cosmosapp-component/README.md#gh-dark-mode-only)

# Reusable Component to Create Globally-distributed Applications with Azure Cosmos DB

This example demonstrates the usage of Pulumi to create globally-distributed applications with Azure Cosmos DB as the backend and pluggable infrastrustructure as the web tier.

The application shows several notable features:

1. Easy global deployments - a config setting provides a list of all the regions to deploy and a single execution deploys across them all.
2. Abstraction - the `CosmosApp` component - abstracts away all the common logic for a global app with Cosmos DB multi-region data distribution and Traffic Manager for routing the traffic.
3. Multi-model - an implementation example is currently provided for serverless functions and virtual machines.

## `CosmosApp` component

The [`CosmosApp`](CosmosApp.cs) defines a skeleton for the application. While not limiting the type of compute resources, it creates the multi-regional pieces of the infrastructure:

![Cosmos App](https://github.com/mikhailshilkov/pulumi-cosmos/raw/master/pictures/globalapp.png)

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install .NET Core 3.0+](https://dotnet.microsoft.com/download)

### Steps

#### Step 1: Create a new stack

```
$ pulumi stack init dev
```

#### Step 2: Log in to the Azure CLI

You will be prompted to do this during deployment if you forget this step.

```
$ az login
```

#### Step 3: Build and publish the Azure Functions project:

    ```
    $ dotnet publish app
    ```

#### Step 4: Configure the list of regions to deploy to

```
$ pulumi config set azure:location westus
$ pulumi config set locations westus,westeurope
```

#### Step 5: Deploy your changes

Run `pulumi up` to preview and deploy changes:

```
$ pulumi up
Previewing changes:
+  azure-cs-cosmosapp-component-dev  create
+  examples:azure:CosmosApp vms create
+  azure:network:VirtualNetwork vnet-westeurope create
+  azure:network:PublicIp pip-westeurope create
+  azure:trafficmanager:Profile tmvms create
+  azure:trafficmanager:Endpoint tmvmswesteurope create
+  azure:cosmosdb:Account cosmos-vms
...
```

### Step 6: Check the deployed website endpoints

Three endpoints are now available. For example,

```
$ pulumi stack output VmssEndpoint
http://vmssrgcc15ea50.trafficmanager.net/cosmos

$ curl "$(pulumi stack output VmssEndpoint)"
Document 'cosmos' not found
```

Go to the Azure portal and add a document with the ID "cosmos" to receive a non-empty response.

### Step 7: Clean up

Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
$ pulumi destroy --yes
$ pulumi stack rm --yes
```
