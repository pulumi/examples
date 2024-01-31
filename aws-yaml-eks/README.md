[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-yaml-eks/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-yaml-eks/README.md#gh-dark-mode-only)

# Amazon EKS Cluster

This example deploys an EKS Kubernetes cluster inside the default AWS VPC.

## Deploying the App

To deploy your infrastructure, follow the below steps.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)

## Deploying and running the program

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-east-2
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 28 created

    Duration: 10m0s
    ```

1.  Check the deployed kubeconfig:

    ```
    $ pulumi stack output kubeconfig
    {"apiVersion":"v1","clusters":[{"cluster":{"certificate-authority-data":"LS0tLS1CRUdJTiBDR...
    ```
