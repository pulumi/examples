[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-java-eks-minimal/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-java-eks-minimal/README.md#gh-dark-mode-only)

# Minimal EKS cluster (in Java)

This example demonstrates consuming
[Pulumi AWS EKS Components](https://github.com/pulumi/pulumi-eks)
from Java.

The high-level Cluster component automatically provisions roles,
security groups and other necessary resources with good defaults,
making it easy to get started. For more information, checkout the
relevant
[Pulumi blog](https://www.pulumi.com/blog/easily-create-and-manage-aws-eks-kubernetes-clusters-with-pulumi).

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Java](https://www.pulumi.com/docs/intro/languages/java/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1.  Deploy the example. Note it will take up to 10 minutes to provision
    the EKS cluster:

    ```bash
    pulumi up
    ```

1.  Access the Kubernetes cluster using `kubectl`.

    To access your new Kubernetes cluster using `kubectl`, we need to
    set up the `kubeconfig` file and download `kubectl`. We can leverage
    the Pulumi stack output in the CLI, as Pulumi facilitates exporting
    these objects for us.

    ```bash
    pulumi stack output kubeconfig --show-secrets > kubeconfig
    export KUBECONFIG=$PWD/kubeconfig
    kubectl version
    kubectl cluster-info
    kubectl get nodes
    ```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
