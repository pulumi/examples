[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-cosmosdb-logicapp/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-cosmosdb-logicapp/README.md#gh-dark-mode-only)

# Azure Cosmos DB, an API Connection, and a Logic App

With the native Azure provider we can directly use the Azure resource manager API to define API connections and linking it to a logic app. The resulting experience is much faster in comparison to performing the same operation through ARM templates.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for Azure](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)

## Running the App

1. Create a new stack:

    ```sh
    $ pulumi stack init dev
    ```

1. Create a Python virtualenv, activate it, and install dependencies:

   This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```bash
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1. Set the required configuration variables for this program, and log into Azure:

    ```bash
    $ pulumi config set azure-native:location westeurope
    $ az login
    ```

1. Perform the deployment:

    ```sh
    $ pulumi up

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

1. At this point, you have a Cosmos DB collection and a Logic App listening to HTTP requests. You can trigger the Logic App with a `curl` command:

    ```
    $ curl -X POST "$(pulumi stack output endpoint)" -d '"Hello World"' -H 'Content-Type: application/json'
    ```

    The POST body will be saved into a new document in the Cosmos DB collection.

1. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
