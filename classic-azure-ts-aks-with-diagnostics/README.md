[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-aks-with-diagnostics/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-aks-with-diagnostics/README.md#gh-dark-mode-only)

# Azure Kubernetes Service (AKS) Cluster with Diagnostics

This example demonstrates creating an Azure Kubernetes Service (AKS) Cluster, and enables diagnostics for the cluster.
Please see https://docs.microsoft.com/en-us/azure/aks/ for more information about AKS.

## Prerequisites

Ensure you have [downloaded and installed the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).

We will be deploying to Azure, so you will need an Azure account. If you don't have an account,
[sign up for free here](https://azure.microsoft.com/en-us/free/).
[Follow the instructions here](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/) to connect Pulumi to your Azure account.

## Running the Example

After cloning this repo, `cd` into it and run these commands. A Kubernetes cluster and Apache web server will appear!

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

2. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set azure:environment public
    $ pulumi config set password --secret [your-cluster-password-here]
    $ ssh-keygen -t rsa -f key.rsa
    $ pulumi config set sshPublicKey < key.rsa.pub
    ```

3. Deploy everything with the `pulumi up` command. This provisions all the Azure resources necessary, including
   an Active Directory service principal, AKS cluster, and then enables diagnostics for the cluster, all in a single gesture:

    ```bash
    $ pulumi up
    ```

4. After a couple minutes, your cluster and Apache server will be ready. Your `kubeconfig` will be the application output and
   you may also configure your `kubectl` client using the `kubeconfig` configuration:

   ```bash
   $ pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
   $ kubectl get namespaces
   ....
   ```

5. At this point, you have a running cluster. Feel free to modify your program, and run `pulumi up` to redeploy changes.
   The Pulumi CLI automatically detects what has changed and makes the minimal edits necessary to accomplish these
   changes. This could be altering the existing chart, adding new Azure or Kubernetes resources, or anything, really.

6. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
