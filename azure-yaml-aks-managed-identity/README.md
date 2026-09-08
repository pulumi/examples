[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-yaml-aks-managed-identity/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-yaml-aks-managed-identity/README.md#gh-dark-mode-only)

# Azure Kubernetes Service (AKS) cluster using the native Azure provider

This example deploys an AKS cluster, creates an Azure User Assigned Managed Identity, and sets credentials to manage access to the cluster.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)

## Deploying the example

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1. Set the Azure region to deploy into:

    ```bash
    pulumi config set azure-native:location westus2
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

1. After 3-4 minutes, your cluster will be ready, and the kubeconfig YAML you'll use to connect to the cluster will be available as an output. Save this kubeconfig to a file:

    ```bash
    pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
    ```

    Once you have this file in hand, you can interact with your new cluster as usual via `kubectl`:

    ```bash
    KUBECONFIG=./kubeconfig.yaml kubectl get nodes
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

## Cleaning up

Once you're finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
