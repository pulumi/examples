[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Deploy an Azure CosmosDB container and an API Connection

At the time of this writting, there was no API support from either Terraform or Azure (or both)
to handle CosmosDB contaiers and API Connections. Therefore, this is a how-to:
 - Levarage Azure's CosmosDB SDK to create a CosmosDB container
 - Use an ARM template to create an API Connection

## Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- [Download and install the Pulumi CLI](https://www.pulumi.com/docs/reference/install/)
- [Connect Pulumi with your Azure account](https://www.pulumi.com/docs/reference/clouds/azure/setup/) (if your `az` CLI is
      configured, this will just work)

## Running the App

1. Create a new stack:

    ```sh
    $ pulumi stack init dev
    ```

2. Set the required configuration variables for this program, and log into Azure:

    ```bash
    $ pulumi config set azure:environment public
    $ az login
    ```

3. Perform the deployment:

    ```sh
    $ pulumi up
    Updating (dev):

        Type                               Name                                   Status      Info
        pulumi:pulumi:Stack                azure-cosmosdb-wtih-apiconnection-dev              3 messages
    +   ├─ azure:core:ResourceGroup        dev-rg                                 created
    +   ├─ azure:storage:Account           devsa                                  created
    +   ├─ azure:cosmosdb:Account          dev-db-acc                             created
    +   ├─ azure:cosmosdb:SqlDatabase      dev-db                                 created
    +   ├─ pulumi-nodejs:dynamic:Resource  dev-db-container                       created
    +   └─ azure:core:TemplateDeployment   db-connection                          created

    Resources:
        + 6 created
        1 unchanged

    Duration: 29m15s
    ```

## Next Steps
As an example, can use the API Connection to establish a Logic App - ComosDB relation:

```typescript
const processUrlTemplate = {
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "connections_cosmosdb_externalid": {
            "defaultValue": pulumi.interpolate`${resourceGroup.id}/providers/Microsoft.Web/connections/${connectionTemplate.resources[0].name}`,
            "type": "String"
        }
    },
    "variables": {},
    "resources": [
        {
            "type": "Microsoft.Logic/workflows",
            "apiVersion": "2017-07-01",
            "name": "process-url",
            "location": "westeurope",
            "properties": {
                "state": "Enabled",
                "definition": {
                    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
                    "contentVersion": "1.0.0.0",
                    "parameters": {
                        "$connections": {
                            "defaultValue": {},
                            "type": "Object"
                        }
                    },
                    "triggers": {
                        "receive-post": {
                            "type": "Request",
                            "kind": "Http",
                            "inputs": {
                                "method": "POST",
                                "schema": {
                                    "properties": {
                                        "url": {
                                            "type": "string"
                                        }
                                    },
                                    "type": "object"
                                }
                            }
                        }
                    },
                    "actions": {}
                },
                "parameters": {
                    "$connections": {
                        "value": {
                            "documentdb": {
                                "connectionId": "[parameters('connections_cosmosdb_externalid')]",
                                "connectionName": "logicapp-cosmosdb-connection",
                                "id": pulumi.interpolate`${connectionTemplate.resources[0].properties.api.id}`
                            }
                        }
                    }
                }
            }
        }
    ]
}

const procesUrlWorkflow = new azure.core.TemplateDeployment("process-url", {
    resourceGroupName: resourceGroup.name,
    templateBody: pulumi.output(processUrlTemplate).apply(JSON.stringify),
    deploymentMode: "Incremental",
}, { dependsOn: [cosmosdbConnection] });
```
