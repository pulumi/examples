[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-eks/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-eks/README.md#gh-dark-mode-only)

# AWS C# EKS cluster

This example creates an AWS EKS Cluster and deploys a sample container application to it.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)
4. [Install `aws-iam-authenticator`](https://docs.aws.amazon.com/eks/latest/userguide/install-aws-iam-authenticator.html)
5. [Install `kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/)

## Deploying the example

1.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1.  Deploy the stack to create the EKS cluster:

    ```bash
    pulumi up
    ```

1.  After 10-15 minutes, your cluster will be ready, and the kubeconfig JSON you'll use to connect to the cluster will
    be available as an output. You can save this kubeconfig to a file like so:

    ```bash
    pulumi stack output kubeconfig --show-secrets >kubeconfig.json
    ```

    Once you have this file in hand, you can interact with your new cluster as usual via `kubectl`:

    ```bash
    KUBECONFIG=./kubeconfig.json kubectl get nodes
    ```

1.  Ensure that the application is running as expected:

    ```bash
    curl $(pulumi stack output Url)
    ```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
