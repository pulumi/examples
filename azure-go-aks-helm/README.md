[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-go-aks-helm/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-go-aks-helm/README.md#gh-dark-mode-only)

# Azure Kubernetes Service (AKS) cluster and Helm chart

This example demonstrates creating an [Azure Kubernetes Service (AKS)](https://docs.microsoft.com/en-us/azure/aks/)
cluster and deploying a Helm Chart from [Bitnami Helm chart repository](https://github.com/bitnami/charts)
into this cluster, all in one Pulumi program.

The example showcases the [native Azure provider for Pulumi](https://www.pulumi.com/docs/intro/cloud-providers/azure/).

In this example we will provision a Kubernetes cluster running a public Apache web server, verify we can access it, and clean up when done.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure Credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploying the example

1.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1.  Set the Azure region location to use:

    ```bash
    pulumi config set azure-native:location westus2
    ```

1.  Install dependencies:

    ```bash
    go mod download
    ```

1.  Deploy everything with the `pulumi up` command. This provisions all the Azure resources necessary, including an Active Directory service principal and AKS cluster, and then deploys the Apache Helm Chart, all in a single gesture (takes 5-10 min):

    ```bash
    pulumi up
    ```

1.  Now your cluster and Apache server are ready. Several output variables will be printed, including your cluster name (`clusterName`), Kubernetes config (`kubeconfig`) and server IP address (`apacheServiceIP`).

    Using these output variables, you may access your Apache server:

    ```bash
    curl $(pulumi stack output apacheServiceIP)
    ```

    ```
    <html><body><h1>It works!</h1></body></html>
    ```

    And you may also configure your `kubectl` client using the `kubeconfig` configuration:

    ```bash
    pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
    KUBECONFIG=./kubeconfig.yaml kubectl get service
    ```

    ```
    NAME           TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)                      AGE
    apache-chart   LoadBalancer   10.0.154.121   40.125.100.104   80:30472/TCP,443:30364/TCP   8m
    kubernetes     ClusterIP      10.0.0.1       <none>           443/TCP                      8m
    ```

1.  At this point, you have a running cluster. Feel free to modify your program, and run `pulumi up` to redeploy changes. The Pulumi CLI automatically detects what has changed and makes the minimal edits necessary to accomplish these changes. This could be altering the existing chart, adding new Azure or Kubernetes resources, or anything, really.

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
rm kubeconfig.yaml
```
