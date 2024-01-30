[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aks-cosmos-helm/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aks-cosmos-helm/README.md#gh-dark-mode-only)

# A Helm chart deployed to AKS that stores TODOs in an Azure Cosmos DB MongoDB API

Stands up an Azure Kubernetes Service (AKS) cluster and a MongoDB-flavored instance of
Azure Cosmos DB. On top of the AKS cluster, we also deploy a Helm Chart with a simple
Node.js TODO app `bitnami/node`, swapping out the usual in-cluster MongoDB instance
with our managed Cosmos DB instance.

## Prerequisites

- Install [Pulumi](https://www.pulumi.com/docs/get-started/install/).

- Install [.NET 5](https://dotnet.microsoft.com/download)

- We will be deploying to Azure, so you will need an Azure account. If
  you do not have an account, [sign up for free here](https://azure.microsoft.com/en-us/free/).

- Setup and authenticate the [native Azure provider for Pulumi](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/).


## Running the Example

In this example we will provision a Kubernetes cluster running a
public Apache web server, verify we can access it, and clean up when
done.

1.  Get the code:

    ```bash
    $ git clone git@github.com:pulumi/examples.git
    $ cd examples/azure-cs-aks-cosmos-helm
    ```

2.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

3.  Set the required configuration variables for this program:

    ```bash
    $ pulumi config set azure-native:location westus2
    ```

4.  Deploy everything with the `pulumi up` command. This provisions
    all the Azure resources necessary, including an Active Directory
    service principal, AKS cluster, and then deploys the Apache Helm
    Chart, all in a single gesture (takes 5-10 min):

    ```bash
    $ pulumi up

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

5.  Now your database, your cluster, and application are ready. An output
    variable will be printed to provide the application endpoint.

    ```bash
    $ curl $(pulumi stack output Endpoint)
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

6.  Once you are done, you can destroy all of the resources, and the
    stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    $ rm kubeconfig.yaml
    ```
