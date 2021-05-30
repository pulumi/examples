[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Kubernetes Service (AKS) Cluster with Azure Container Registry and Keda

This example deploys an AKS cluster, creates an Azure Active AD application, creates a Service Principal, sets credentials to manage access to the cluster create, associate a Azure Registry Container and deploy Keda with Helm.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install Python 3.6 or higher](https://www.python.org/downloads/)
3. [Configure Azure Credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)

Important: if you have more than one Azure Subscription, make sure that de deploy will be done in the correct one with this command:

   ```bash
    $ az account set --subscription subscription_id
   ```

### Steps

After cloning this repo, from this working directory, run these commands:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

1. Set the Azure region location to use:
   
    ```
    $ pulumi config set azure-native:location eastus
    ```

1. Optionaly set a prefix for all names (like your product or squad name)

    ```
    $ pulumi config set name_prefix my-fancy-project
    ```

1. Initiate pulumi to stand up the cluster

    ```bash
    $ pulumi up
    ```

1. After 3-4 minutes, your cluster will be ready, and the kubeconfig YAML you'll use to connect to the cluster will be available as an output. You can save this kubeconfig to a file like so:

    ```bash
    $ pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
    ```

    Once you have this file in hand, you can interact with your new cluster as usual via `kubectl`:

    ```bash
    $ KUBECONFIG=./kubeconfig.yaml kubectl get nodes
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```