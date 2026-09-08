[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-nginx/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-nginx/README.md#gh-dark-mode-only)

# Stateless application using a deployment

A version of the [Kubernetes Stateless Application Deployment](
https://kubernetes.io/docs/tasks/run-application/run-stateless-application-deployment/) example that uses Pulumi.
This example deploys a replicated NGINX server to a Kubernetes cluster, using TypeScript and no YAML.

There is an [interactive Tutorial available](https://www.pulumi.com/docs/tutorials/kubernetes/stateless-app/) for
this example. If this is your first time using Pulumi for Kubernetes, we recommend starting there.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating stack 'k8s-nginx-dev'
    Performing changes:

         Type                           Name                     Status      Info
     +   pulumi:pulumi:Stack            k8s-nginx-k8s-nginx-dev  created
     +   └─ kubernetes:apps:Deployment  nginx                    created

    info: 2 changes performed:
        + 2 resources created
    Update duration: 18.291517072s
    ```

    This deployment is now running, and you can run commands like `kubectl get pods` to see the application's resources.

The stack's replica count is configurable. By default, it will scale up to two instances, but you can easily change
that to five, by running the `pulumi config` command followed by another `pulumi up`:

```bash
pulumi config set replicas 5
pulumi up
```

```
Updating stack 'k8s-nginx-dev'
Performing changes:

     Type                           Name                     Status      Info
 *   pulumi:pulumi:Stack            k8s-nginx-k8s-nginx-dev  done
 ~   └─ kubernetes:apps:Deployment  nginx                    updated     changes: ~ spec

info: 1 change performed:
    ~ 1 resource updated
      1 resource unchanged
Update duration: 4.324849549s
```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
