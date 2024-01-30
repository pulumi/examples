[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-aks-mean/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-aks-mean/README.md#gh-dark-mode-only)

# Azure Kubernetes Service (AKS) App Using CosmosDB

Stands up an [Azure Kubernetes Service][aks] (AKS) cluster and a MongoDB-flavored instance of
[CosmosDB][cosmos]. On top of the AKS cluster, we also deploy a [Helm][helm] Chart with a simple
Node.js TODO app ([`bitnami/node`][bitnami-node]), swapping out the usual in-cluster MongoDB instance
with our managed CosmosDB instance.

## Prerequisites

Ensure you have downloaded and installed the [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).

We will be deploying to Azure, so you will need an Azure account. If you don't have an account,
sign up for a [free Azure account](https://azure.microsoft.com/en-us/free/). Follow the instructions to
[connect Pulumi to your Azure account](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/).

This example deploys a Helm Chart from [Bitnami's Helm chart repository](https://github.com/bitnami/charts).

Install dependencies:

```sh
npm install
```

## Running the App

1. Create a new stack:

    ```sh
    $ pulumi stack init
    Enter a stack name: azure-mean
    ```

1. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set azure:environment public
    $ pulumi config set password --secret [your-cluster-password-here]
    $ ssh-keygen -t rsa -f key.rsa
    $ pulumi config set sshPublicKey < key.rsa.pub
    $ az login
    ```

1. Perform the deployment:

    ```sh
    $ pulumi up
    Updating stack 'azure-mean'
    Performing changes:

         Type                                         Name                   Status      Info
     +   pulumi:pulumi:Stack                          azure-mean-azure-mean  created     1 warning
     +   ├─ azure:core:ResourceGroup                  aks                    created
     +   ├─ azure:ad:Application                      aks                    created
     +   ├─ azure:ad:ServicePrincipal                 aksSp                  created
     +   ├─ azure:ad:ServicePrincipalPassword         aksSpPassword          created
     +   ├─ azure:cosmosdb:Account                    cosmosDb               created
     +   ├─ azure:containerservice:KubernetesCluster  aksCluster             created
     +   ├─ pulumi:providers:kubernetes               aksK8s                 created
     +   ├─ kubernetes:core:Secret                    mongo-secrets          created
     +   └─ kubernetes:helm.sh:Chart                  node                   created
     +      ├─ kubernetes:core:Service                node-node              created
     +      └─ kubernetes:extensions:Deployment       node-node              created

    ---outputs:---
    cluster        : "aksclusterbfb9388b"
    kubeconfig     : "[secret]"

    info: 12 changes performed:
        + 12 resources created
    Update duration: 14m33.922322098s

    Permalink: https://app.pulumi.com/hausdorff/azure-mean/updates/1
    ```

    We can see here in the `---outputs:---` section that our Node.js app was allocated a public IP,
    in this case `40.76.25.71`. It is exported with a stack output variable, `frontendAddress`. We
    can use `curl` and `grep` to retrieve the `<title>` of the site the proxy points at.

    ```sh
    $ curl -sL $(pulumi stack output frontendAddress) | grep "<title>"
        <title>Node/Angular Todo App</title>>
    ```

## Next steps

One of the interesting aspects of this example is the way it demonstrates how easy it is to use
Azure resources to configure Kubernetes resources, without the need for intermediate APIs such as
[Open Service Broker for Azure](https://github.com/Azure/open-service-broker-azure). In particular, this example uses the connection strings exposed by the CosmosDB instance to configure the `bitnami/node` Helm Chart to connect to CosmosDB, instead of
creating and connecting to an in-cluster MongoDB instance.

In `index.ts`, we see the MongoDB-flavored CosmosDB resource definition:

```javascript
// Create a MongoDB-flavored instance of CosmosDB.
const cosmosdb = new azure.cosmosdb.Account("cosmosDb", {
    kind: "MongoDB",
    resourceGroupName: config.resourceGroup.name,
    consistencyPolicy: {
        consistencyLevel: "BoundedStaleness",
        maxIntervalInSeconds: 300,
        maxStalenessPrefix: 100000,
    },
    offerType: "Standard",
    enableAutomaticFailover: true,
    geoLocations: [
        { location: config.location, failoverPriority: 0 },
        { location: config.failoverLocation, failoverPriority: 1 },
    ],
});
```

And then subsequently, in the same file, we see that we use this CosmosDB object to create a
Kubernetes `Secret` containing the connection credentials, which is then consumed by the
`bitnami/node` Helm chart to connect.

```javascript
// Create secret from MongoDB connection string.
const mongoConnStrings = new k8s.core.v1.Secret(
    "mongo-secrets",
    {
        metadata: { name: "mongo-secrets" },
        data: mongoHelpers.parseConnString(cosmosdb.connectionStrings),
    },
    { provider: k8sProvider },
);

// Boot up Node.js Helm chart example using CosmosDB in place of in-cluster MongoDB.
const node = new k8s.helm.v3.Chart(
    "node",
    {
        chart: "node",
        version: "19.0.2",
        fetchOpts: {
            repo: "https://charts.bitnami.com/bitnami",
        },
        values: {
            serviceType: "LoadBalancer",
            mongodb: { install: false },
            externaldb: { ssl: true, secretName: "mongo-secrets" },
        },
    },
    { providers: { kubernetes: k8sProvider }, dependsOn: mongoConnStrings },
);
```

[bitnami-node]: https://artifacthub.io/packages/helm/bitnami/node/19.0.2/
[aks]: https://azure.microsoft.com/en-us/services/kubernetes-service/
[cosmos]: https://azure.microsoft.com/en-us/services/cosmos-db/
[helm]: https://www.helm.sh/
