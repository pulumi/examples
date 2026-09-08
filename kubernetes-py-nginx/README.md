[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-nginx/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-nginx/README.md#gh-dark-mode-only)

# Stateless application using a deployment

A version of the [Kubernetes Stateless Application Deployment](
https://kubernetes.io/docs/tasks/run-application/run-stateless-application-deployment/) example that uses Pulumi.
This example deploys a replicated NGINX server to a Kubernetes cluster, using Python and no YAML.

There is an [interactive Tutorial available](https://www.pulumi.com/docs/tutorials/kubernetes/stateless-app/) for
this example. If this is your first time using Pulumi for Kubernetes, we recommend starting there.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):
        Type                           Name                     Status
    +   pulumi:pulumi:Stack            kubernetes-py-nginx-dev  created
    +   └─ kubernetes:apps:Deployment  nginx-deployment         created

    Outputs:
        nginx: "nginx-deployment-ts0qpwi9"

    Resources:
        + 2 created

    Duration: 10s
    ```

    This deployment is now running, and you can run commands like `kubectl get pods` to see the application's resources.

The stack's replica count is configurable. By default, it will scale up to two instances, but you can easily change
that to five, by running the `pulumi config` command followed by another `pulumi up`:

```bash
pulumi config set replicas 5
pulumi up
```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
