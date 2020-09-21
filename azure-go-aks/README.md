[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Kubernetes Service (AKS) Cluster

Stands up an [Azure Kubernetes Service](https://azure.microsoft.com/en-us/services/kubernetes-service/) (AKS) cluster and
deploys an application to it.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Azure](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)

### Steps

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    $ az login
    ```
   
1. Set the Azure region location to use:
    
    ```bash
    $ pulumi config set azure:location westus
    ```

1. Stand up the AKS cluster:

    > **Note**: Due to an [issue](https://github.com/terraform-providers/terraform-provider-azuread/issues/156) in Azure Terraform Provider, the
    > creation of an Azure Service Principal, which is needed to create the Kubernetes cluster, is delayed and may not
    > be available when the cluster is created.  If you get a "Service Principal not found" error, as a work around, you should be able to run `pulumi up`
    > again, at which time the Service Principal replication should have been completed. See [this issue](https://github.com/Azure/AKS/issues/1206) and
    > [this doc](https://docs.microsoft.com/en-us/azure/aks/troubleshooting#im-receiving-errors-that-my-service-principal-was-not-found-when-i-try-to-create-a-new-cluster-without-passing-in-an-existing-one)
    > for further details.

    ```bash
    $ pulumi up
    ```

1. After 10-15 minutes, your cluster will be ready, and the kubeconfig YAML you'll use to connect to the cluster will be available as an output. You can save this kubeconfig to a file like so:

    ```bash
    $ pulumi stack output kubeconfig > kubeconfig.yaml
    ```

    Once you have this file in hand, you can interact with your new cluster as usual via `kubectl`:

    ```bash
    $ KUBECONFIG=./kubeconfig.yaml kubectl get nodes
    ```

1. You can check that the application is loadbalanced across all of the pods:

    ```bash
    $ for i in {0..10}; do curl $(pulumi stack output url); done
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
