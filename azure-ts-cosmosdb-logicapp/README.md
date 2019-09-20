[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Cosmos DB, an API Connection, and a Logic App

At the time of writing, there is no native Pulumi resource for defining an API Connection and linking it to a Logic App. This example shows how to use an ARM templates to create an API Connection and a Logic App.

## Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- [Download and install the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Connect Pulumi with your Azure account](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/) (if your `az` CLI is configured, this will just work)

## Running the App

1. Create a new stack:

    ```sh
    $ pulumi stack init dev
    ```

2. Set the required configuration variables for this program, and log into Azure:

    ```bash
    $ pulumi config set azure:location westeurope
    $ az login
    ```

3. Perform the deployment:

    ```sh
    $ pulumi up
         Type                               Name                         Status
     +   pulumi:pulumi:Stack                azure-cosmosdb-logicapp-dev  created
     +   ├─ azure:core:ResourceGroup        logicappdemo-rg              created
     +   ├─ azure:cosmosdb:Account          logicappdemo-cdb             created
     +   ├─ azure:storage:Account           logicappdemosa               created
     +   ├─ azure:cosmosdb:SqlDatabase      db                           created
     +   ├─ azure:cosmosdb:SqlContainer     container                    created
     +   ├─ azure:core:TemplateDeployment   db-connection                created
     +   ├─ azure:core:TemplateDeployment   logic-app                    created
     +   └─ azure:logicapps:ActionCustom    Create_or_update_document    created

    Resources:
        + 9 created

    Duration: 15m10s
    ```

4. At this point, you have a Cosmos DB collection and a Logic App listening to HTTP requests. You can trigger the Logic App with a `curl` command:

    ```
    $ curl -X POST '$(pulumi stack output endpoint)' -d '"Hello World"' -H 'Content-Type: application/json'
    ```

    The POST body will be saved into a new document in the Cosmos DB collection.

5. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
