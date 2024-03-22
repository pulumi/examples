[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-java-eks-minimal/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-java-eks-minimal/README.md#gh-dark-mode-only)

# eks-minimal

This example demonstrates consuming
[Pulumi AWS EKS Components](https://github.com/pulumi/pulumi-eks)
from Java.

The high-level Cluster component automatically provisions roles,
security groups and other necessary resources with good defaults,
making it easy to get started. For more information, checkout the
relevant
[Pulumi blog](https://www.pulumi.com/blog/easily-create-and-manage-aws-eks-kubernetes-clusters-with-pulumi)


## Running the example

1. Start a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Configure your AWS region, for example:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1. Deploy the example. Note it will take up to 10 minutes to provision
   the EKS cluster:

    ```bash
    pulumi up
    ```

1. Access the Kubernetes Cluster using `kubectl`.

   To access your new Kubernetes cluster using `kubectl`, we need to
   setup the `kubeconfig` file and download `kubectl`. We can leverage
   the Pulumi stack output in the CLI, as Pulumi facilitates exporting
   these objects for us.

    ```bash
    $ pulumi stack output kubeconfig --show-secrets > kubeconfig
    $ export KUBECONFIG=$PWD/kubeconfig
    $ kubectl version
    $ kubectl cluster-info
    $ kubectl get nodes
    ```
