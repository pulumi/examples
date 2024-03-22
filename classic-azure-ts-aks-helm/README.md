[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-aks-helm/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-aks-helm/README.md#gh-dark-mode-only)

# Azure Kubernetes Service (AKS) Cluster and Helm Chart

This example demonstrates creating an Azure Kubernetes Service (AKS) Cluster, and deploying a Helm Chart into it,
all in one Pulumi program. Please see https://docs.microsoft.com/en-us/azure/aks/ for more information about AKS.

## Prerequisites

Ensure you have [downloaded and installed the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).

We will be deploying to Azure, so you will need an Azure account. If you don't have an account,
[sign up for free here](https://azure.microsoft.com/en-us/free/).
[Follow the instructions here](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/) to connect Pulumi to your Azure account.

This example deploys a Helm Chart from [Bitnami's Helm chart repository](https://github.com/bitnami/charts)

In addition you will need the following CLI tools:

```
$ az --version # Azure CLI
azure-cli                         2.11.1
core                              2.11.1
telemetry                          1.0.5
...

$ npm --version # Node.js Package Manager
6.14.6

$ tsc --version # TypeScript compiler
Version 4.0.2
```

## Running the Example

After cloning this repo, `cd` into it and run these commands. A Kubernetes cluster and Apache web server will appear!

1. Login to your Azure account:

    ```bash
    $ az login
    ```

2. Download nodejs dependencies:

    ```bash
    $ npm install
    ```

3. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

4. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set azure:environment public
    $ pulumi config set password --secret [your-cluster-password-here]
    $ ssh-keygen -t rsa -f key.rsa
    $ pulumi config set sshPublicKey < key.rsa.pub
    ```

5. Deploy everything with the `pulumi up` command. This provisions all the Azure resources necessary, including
   an Active Directory service principal, AKS cluster, and then deploys the Apache Helm Chart, all in a single gesture:

    > **Note**: Due to an [issue](https://github.com/terraform-providers/terraform-provider-azuread/issues/156) in Azure Terraform Provider, the
    > creation of an Azure Service Principal, which is needed to create the Kubernetes cluster (see cluster.ts), is delayed and may not
    > be available when the cluster is created.  If you get a "Service Principal not found" error, as a work around, you should be able to run `pulumi up`
    > again, at which time the Service Principal replication should have been completed. See [this issue](https://github.com/Azure/AKS/issues/1206) and
    > [this doc](https://docs.microsoft.com/en-us/azure/aks/troubleshooting#im-receiving-errors-that-my-service-principal-was-not-found-when-i-try-to-create-a-new-cluster-without-passing-in-an-existing-one)
    > for further details.

    ```bash
    $ pulumi up
    ```

6. After a couple minutes, your cluster and Apache server will be ready. Three output variables will be printed,
   reflecting your cluster name (`cluster`), Kubernetes config (`kubeConfig`) and server IP address (`serviceIP`).

   Using these output variables, you may `curl` your Apache server's `serviceIP`:

   ```bash
   $ curl $(pulumi stack output serviceIP)
   <html><body><h1>It works!</h1></body></html>
   ```

   And you may also configure your `kubectl` client using the `kubeConfig` configuration:

   ```bash
   $ pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
   $ KUBECONFIG=./kubeconfig.yaml kubectl get service
   NAME            TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)                      AGE
   apache-apache   LoadBalancer   10.0.125.196   40.76.52.208   80:32080/TCP,443:31419/TCP   9m
   kubernetes      ClusterIP      10.0.0.1       <none>         443/TCP                      13h
   ```

7. At this point, you have a running cluster. Feel free to modify your program, and run `pulumi up` to redeploy changes.
   The Pulumi CLI automatically detects what has changed and makes the minimal edits necessary to accomplish these
   changes. This could be altering the existing chart, adding new Azure or Kubernetes resources, or anything, really.

8. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```

9. If you make changes to the example `ts` code outside of an IDE, run
   the TypeScript compiler to check your changes:

    ```bash
    $ tsc --build tsconfig.json
    ```
