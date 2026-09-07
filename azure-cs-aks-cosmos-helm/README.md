[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aks-cosmos-helm/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aks-cosmos-helm/README.md#gh-dark-mode-only)

# AKS Helm chart with Azure Cosmos DB

Stands up an Azure Kubernetes Service (AKS) cluster and a MongoDB-flavored instance of
Azure Cosmos DB. On top of the AKS cluster, we also deploy a Helm Chart with a simple
Node.js TODO app `bitnami/node`, swapping out the usual in-cluster MongoDB instance
with our managed Cosmos DB instance.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure Credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1.  Set the Azure region location to use:

    ```bash
    pulumi config set azure-native:location westus2
    ```

1.  Deploy everything with the `pulumi up` command. This provisions all the Azure
    resources necessary, including an Active Directory service principal, AKS cluster,
    Cosmos DB instance, and then deploys the Helm Chart, all in a single gesture (takes
    5-10 min):

    ```bash
    pulumi up
    ```

    ```
         Type                                                          Name                          Status      Info
    +   pulumi:pulumi:Stack                                           azure-cs-aks-cosmos-helm-dev  created     1 warning
    +   ├─ kubernetes:helm.sh/v3:Chart                                node                          created
    +   │  ├─ kubernetes:core/v1:Service                              node                          created
    +   │  └─ kubernetes:apps/v1:Deployment                           node                          created
    +   ├─ example:component:CosmosDBMongoDB                          mongo-todos                   created
    +   │  ├─ azure-native:documentdb:DatabaseAccount                 cosmos-mongodb                created
    +   │  └─ azure-native:documentdb:MongoDBResourceMongoDBDatabase  todos                         created
    +   ├─ example:component:AksCluster                               demoaks                       created
    +   │  ├─ azuread:index:Application                               app                           created
    +   │  ├─ random:index:RandomPassword                             pw                            created
    +   │  ├─ tls:index:PrivateKey                                    ssh-key                       created
    +   │  ├─ azuread:index:ServicePrincipal                          service-principal             created
    +   │  ├─ azuread:index:ServicePrincipalPassword                  sp-password                   created
    +   │  ├─ azure-native:containerservice:ManagedCluster            demoaks                       created
    +   │  └─ pulumi:providers:kubernetes                             k8s-provider                  created
    +   ├─ azure-native:resources:ResourceGroup                       cosmosrg                      created
    +   └─ kubernetes:core/v1:Secret                                  mongo-secrets                 created

    Outputs:
        Endpoint: "http://20.73.205.163"
    ```

1.  Now your database, your cluster, and application are ready. An output variable is
    printed to provide the application endpoint:

    ```bash
    curl $(pulumi stack output Endpoint)
    ```

    ```
    <!doctype html>

    <!-- ASSIGN OUR ANGULAR MODULE -->
    <html ng-app="scotchTodo">
    <head>
        <!-- META -->
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1"><!-- Optimize mobile viewport -->

        <title>Node/Angular Todo App</title>
    ...
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
rm kubeconfig.yaml
```
