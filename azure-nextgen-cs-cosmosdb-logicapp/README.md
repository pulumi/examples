[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Cosmos DB, an API Connection, and a Logic App

With the native Azure provider we can directly use the Azure resource manager API to define API connections and linking it to a logic app. The resulting experience is much faster in comparison to performing the same operation through ARM templates.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install .NET Core 3.1+](https://dotnet.microsoft.com/download)

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

         Type                                                        Name                         Status      
     +   pulumi:pulumi:Stack                                         azure-cosmosdb-logicapp-dev  created     
     +   ├─ azure-nextgen:resources/latest:ResourceGroup             logicappdemo-rg              created     
     +   ├─ azure-nextgen:storage/latest:StorageAccount              logicappdemosa               created     
     +   ├─ azure-nextgen:documentdb/latest:DatabaseAccount          logicappdemo-cdb             created     
     +   ├─ azure-nextgen:documentdb/latest:SqlResourceSqlDatabase   db                           created     
     +   ├─ azure-nextgen:web/latest:Connection                      cosmosdbConnection           created     
     +   ├─ azure-nextgen:documentdb/latest:SqlResourceSqlContainer  container                    created     
     +   └─ azure-nextgen:logic/latest:Workflow                      workflow                     created     
 
    Resources:
        + 8 created

    Duration: 3m16s
    ```

4. At this point, you have a Cosmos DB collection and a Logic App listening to HTTP requests. You can trigger the Logic App with a `curl` command:

    ```
    $ curl -X POST "$(pulumi stack output endpoint)" -d '"Hello World"' -H 'Content-Type: application/json'
    ```

    The POST body will be saved into a new document in the Cosmos DB collection.

5. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
