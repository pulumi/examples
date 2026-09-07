[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-fs-aks/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-fs-aks/README.md#gh-dark-mode-only)

# Azure Kubernetes Service (AKS) cluster

Stands up an [Azure Kubernetes Service](https://azure.microsoft.com/en-us/services/kubernetes-service/) (AKS) cluster, written in F#.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1.  Set the Azure location and subscription to deploy into:

    ```bash
    pulumi config set azure:location westeurope
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

1.  Export the Kubernetes config and use it to access the cluster:

    ```bash
    pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
    KUBECONFIG=./kubeconfig.yaml kubectl get nodes
    ```

### Using the Makefile

To make it easier to try out, you can use the included [Makefile](Makefile) instead of the native commands above:

```bash
make deploy         # builds the project and runs `pulumi up -y`
make exportconfig   # writes the cluster kubeconfig to kubeconfig.yaml
```

To list all make targets, run:

```bash
make help
```

The [Makefile](Makefile) also works as documentation for the commands you need to run to deploy the application.

## Cleaning up

Once you are done, destroy the stack and remove it. With the Makefile:

```bash
make destroy
make rmstack
```

Or with the native commands:

```bash
pulumi destroy
pulumi stack rm
```
