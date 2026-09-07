[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-cosmosdb-logicapp/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-cosmosdb-logicapp/README.md#gh-dark-mode-only)

# Azure Cosmos DB, an API connection, and a Logic App

With the native Azure provider we can directly use the Azure resource manager API to define API connections and linking it to a logic app. The resulting experience is much faster in comparison to performing the same operation through ARM templates.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Set the Azure region to deploy into:

    ```bash
    pulumi config set azure-native:location westeurope
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
         Type                                                        Name                         Status
     +   pulumi:pulumi:Stack                                         azure-cosmosdb-logicapp-dev  created
     +   ├─ azure-native:resources:ResourceGroup                     logicappdemo-rg              created
     +   ├─ azure-native:storage:StorageAccount                      logicappdemosa               created
     +   ├─ azure-native:documentdb:DatabaseAccount                  logicappdemo-cdb             created
     +   ├─ azure-native:documentdb:SqlResourceSqlDatabase           db                           created
     +   ├─ azure-native:web:Connection                              cosmosdbConnection           created
     +   ├─ azure-native:documentdb:SqlResourceSqlContainer          container                    created
     +   └─ azure-native:logic:Workflow                              workflow                     created

    Resources:
        + 8 created

    Duration: 3m16s
    ```

1. At this point, you have a Cosmos DB collection and a Logic App listening to HTTP requests. Trigger the Logic App with a `curl` command:

    ```bash
    curl -X POST "$(pulumi stack output endpoint)" -d '"Hello World"' -H 'Content-Type: application/json'
    ```

    The POST body will be saved into a new document in the Cosmos DB collection.

## Cleaning up

Once you are finished, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
