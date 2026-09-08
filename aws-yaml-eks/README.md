[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-yaml-eks/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-yaml-eks/README.md#gh-dark-mode-only)

# Amazon EKS cluster

This example deploys an EKS Kubernetes cluster inside the default AWS VPC.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-2
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 28 created

    Duration: 10m0s
    ```

1.  Check the deployed kubeconfig:

    ```bash
    pulumi stack output kubeconfig
    ```

    ```
    {"apiVersion":"v1","clusters":[{"cluster":{"certificate-authority-data":"LS0tLS1CRUdJTiBDR...
    ```

## Cleaning up

Once you're finished, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
