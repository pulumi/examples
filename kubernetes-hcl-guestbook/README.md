[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-hcl-guestbook/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-hcl-guestbook/README.md#gh-dark-mode-only)

# Kubernetes Guestbook written in HCL

A version of the [Kubernetes Guestbook](https://kubernetes.io/docs/tutorials/stateless-application/guestbook/)
application, written in [Pulumi HCL](https://www.pulumi.com/docs/languages-sdks/hcl/). It deploys a
Redis leader, Redis replicas, and a PHP frontend exposed through a `LoadBalancer` service. Pulumi
installs the HCL language plugin and the Terraform Kubernetes provider automatically the first time
you run the program.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)

## Deploying the example

1.  Make sure `~/.kube/config` points at a running Kubernetes cluster. The frontend service has type
    `LoadBalancer`, so the cluster must be able to provision one — on minikube, enable the MetalLB
    addon.

1.  Create a new stack:

    ```bash
    pulumi stack init guestbook-testing
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

1.  Open the frontend IP in a browser to use the guestbook:

    ```bash
    pulumi stack output frontend_ip
    ```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
