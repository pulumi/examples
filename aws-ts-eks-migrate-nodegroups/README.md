[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-eks-migrate-nodegroups/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-eks-migrate-nodegroups/README.md#gh-dark-mode-only)

# Zero downtime migration of EKS node groups

Creates an EKS cluster with node groups and a workload, and showcases adding a
node group to use for workload migration with zero downtime.

This is a Kubernetes Day 2 operations walkthrough: it stands up two worker node groups with different instance types and AMIs, deploys the [NGINX Ingress Controller](https://github.com/kubernetes/ingress-nginx) and a simple echoserver app across them, then migrates NGINX onto a new, larger node group with zero downtime before decommissioning the original one.

The migration relies on Pulumi's create-before-delete model and autonaming — the replacement node group is created and workloads are shifted onto it before the original is drained and deleted — combined with Kubernetes high-availability settings (rolling updates, scheduling affinity, and graceful pod termination) so that in-flight requests keep returning `HTTP 200` throughout.

For step-by-step instructions, check out the [tutorial][tutorial-migrate-nodegroups].

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1. Install dependencies:

    ```bash
    npm install
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

Then follow the [tutorial][tutorial-migrate-nodegroups] for the step-by-step migration walkthrough.

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring further charges:

```bash
pulumi destroy
pulumi stack rm
```

[tutorial-migrate-nodegroups]: https://www.pulumi.com/docs/tutorials/kubernetes/eks-migrate-nodegroups/
