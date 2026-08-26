[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-hcl-guestbook/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-hcl-guestbook/README.md#gh-dark-mode-only)

# Kubernetes Guestbook, Written in HCL

A version of the [Kubernetes Guestbook](https://kubernetes.io/docs/tutorials/stateless-application/guestbook/)
application, written in [Pulumi HCL](https://www.pulumi.com/docs/languages-sdks/hcl/). It deploys a
Redis leader, Redis replicas, and a PHP frontend exposed through a `LoadBalancer` service. Pulumi
installs the HCL language plugin and the Terraform Kubernetes provider automatically the first time
you run the program.

## Running the app

1.  Make sure `~/.kube/config` points at a running Kubernetes cluster. The frontend service has
    type `LoadBalancer`, so the cluster must be able to provision one — on minikube, enable the
    MetalLB addon.

1.  Create a new stack:

    ```bash
    $ pulumi stack init guestbook-testing
    ```

1.  Run `pulumi up` to preview and deploy changes. After the preview is shown you will be
    prompted if you want to continue or not.

1.  Open the frontend IP in a browser to use the guestbook:

    ```bash
    $ pulumi stack output frontend_ip
    ```

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
