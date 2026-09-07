[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-cosmosdb-logicapp/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-cosmosdb-logicapp/README.md#gh-dark-mode-only)

# Azure Cosmos DB, an API connection, and a Logic App

With the native Azure provider we can directly use the Azure resource manager API to define API connections and linking it to a logic app. The resulting experience is much faster in comparison to performing the same operation through ARM templates.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the Azure region to deploy into, and log into Azure:

    ```bash
    pulumi config set azure-native:location westeurope
    az login
    ```

1. Install dependencies:

    ```bash
    npm install
    ```

1. Perform the deployment:

    ```bash
    pulumi up
    ```

    ```
         Type                                                Name                         Status
     +   pulumi:pulumi:Stack                                 azure-cosmosdb-logicapp-dev  created
     +   ├─ azure-native:resources:ResourceGroup             logicappdemo-rg              created
     +   ├─ azure-native:storage:StorageAccount              logicappdemosa               created
     +   ├─ azure-native:documentdb:DatabaseAccount          logicappdemo-cdb             created
     +   ├─ azure-native:documentdb:SqlResourceSqlDatabase   db                           created
     +   ├─ azure-native:web:Connection                      cosmosdbConnection           created
     +   ├─ azure-native:documentdb:SqlResourceSqlContainer  container                    created
     +   └─ azure-native:logic:Workflow                      workflow                     created

    Resources:
        + 8 created

    Duration: 3m16s
    ```

1. At this point, you have a Cosmos DB collection and a Logic App listening to HTTP requests. You can trigger the Logic App with a `curl` command:

    ```bash
    curl -X POST "$(pulumi stack output endpoint)" -d '"Hello World"' -H 'Content-Type: application/json'
    ```

    The POST body will be saved into a new document in the Cosmos DB collection.

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
