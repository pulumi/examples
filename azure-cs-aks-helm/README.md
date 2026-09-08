[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aks-helm/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aks-helm/README.md#gh-dark-mode-only)

# Azure Kubernetes Service (AKS) cluster and Helm chart

This example demonstrates creating an [Azure Kubernetes Service (AKS)](https://docs.microsoft.com/en-us/azure/aks/)
cluster and deploying a Helm Chart from [Bitnami Helm chart repository](https://github.com/bitnami/charts)
into this cluster, all in one Pulumi program.

The example showcases the [native Azure provider for Pulumi](https://www.pulumi.com/docs/intro/cloud-providers/azure/).

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

This example provisions a Kubernetes cluster running a public Apache web server, then
verifies that you can access it.

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
    and then deploys the Apache Helm Chart, all in a single gesture (takes 5-10 min):

    ```bash
    pulumi up
    ```

1.  Now your cluster and Apache server are ready. Several output variables are printed,
    including your cluster name (`ClusterName`), Kubernetes config (`Kubeconfig`) and
    server IP address (`ApacheServiceIP`).

    Using these output variables, you may access your Apache server:

    ```bash
    curl $(pulumi stack output ApacheServiceIP)
    ```

    ```
    <html><body><h1>It works!</h1></body></html>
    ```

    And you may also configure your `kubectl` client using the `Kubeconfig` configuration:

    ```bash
    pulumi stack output Kubeconfig --show-secrets > kubeconfig.yaml
    KUBECONFIG=./kubeconfig.yaml kubectl get service
    ```

    ```
    NAME           TYPE           CLUSTER-IP    EXTERNAL-IP   PORT(S)                      AGE
    apache-chart   LoadBalancer   10.0.58.153   20.51.80.30   80:32707/TCP,443:32495/TCP   3m23s
    kubernetes     ClusterIP      10.0.0.1      <none>        443/TCP                      21m
    ```

1.  At this point, you have a running cluster. Feel free to modify your program, and run
    `pulumi up` to redeploy changes. The Pulumi CLI automatically detects what has
    changed and makes the minimal edits necessary to accomplish these changes. This could
    be altering the existing chart, adding new Azure or Kubernetes resources, or anything,
    really.

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
rm kubeconfig.yaml
```
