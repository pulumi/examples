[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aks-helm/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aks-helm/README.md#gh-dark-mode-only)

# Azure Kubernetes Service (AKS) Cluster and Helm Chart

This example demonstrates creating an [Azure Kubernetes Service (AKS)](https://docs.microsoft.com/en-us/azure/aks/)
cluster and deploying a Helm Chart from [Bitnami Helm chart repository](https://github.com/bitnami/charts)
into this cluster, all in one Pulumi program.

The example showcases the [native Azure provider for Pulumi](https://www.pulumi.com/docs/intro/cloud-providers/azure/).


## Prerequisites

- Install [Pulumi](https://www.pulumi.com/docs/get-started/install/).

- Install [.NET Core](https://dotnet.microsoft.com/download)

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
    $ cd examples/azure-cs-aks-helm
    ```

2.  Restore dependencies and build:

    ```bash
    $ dotnet build
    ```

3.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

4.  Set the required configuration variables for this program:

    ```bash
    $ pulumi config set azure-native:location westus2
    ```

5.  Deploy everything with the `pulumi up` command. This provisions
    all the Azure resources necessary, including an Active Directory
    service principal, AKS cluster, and then deploys the Apache Helm
    Chart, all in a single gesture (takes 5-10 min):

    ```bash
    $ pulumi up
    ```

6.  Now your cluster and Apache server are ready. Several output
    variables will be printed, including your cluster name
    (`ClusterName`), Kubernetes config (`Kubeconfig`) and server IP
    address (`ApacheServiceIP`).

    Using these output variables, you may access your Apache server:

    ```bash
    $ curl $(pulumi stack output ApacheServiceIP)
    <html><body><h1>It works!</h1></body></html>
    ```

    And you may also configure your `kubectl` client using the
    `Kubeconfig` configuration:

    ```bash
    $ pulumi stack output Kubeconfig --show-secrets > kubeconfig.yaml
    $ KUBECONFIG=./kubeconfig.yaml kubectl get service

    NAME           TYPE           CLUSTER-IP    EXTERNAL-IP   PORT(S)                      AGE
    apache-chart   LoadBalancer   10.0.58.153   20.51.80.30   80:32707/TCP,443:32495/TCP   3m23s
    kubernetes     ClusterIP      10.0.0.1      <none>        443/TCP                      21m
    ```

7.  At this point, you have a running cluster. Feel free to modify
    your program, and run `pulumi up` to redeploy changes. The Pulumi
    CLI automatically detects what has changed and makes the minimal
    edits necessary to accomplish these changes. This could be
    altering the existing chart, adding new Azure or Kubernetes
    resources, or anything, really.

    TIP: if you make changes to the example code outside of an IDE,
    run the C# compiler after every change:

    ```bash
    $ dotnet build
    ```

8.  Once you are done, you can destroy all of the resources, and the
    stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    $ rm kubeconfig.yaml
    ```
