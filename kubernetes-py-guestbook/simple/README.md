[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-guestbook/simple/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-guestbook/simple/README.md#gh-dark-mode-only)

# Kubernetes Guestbook (simple variant)

A version of the [Kubernetes Guestbook](https://kubernetes.io/docs/tutorials/stateless-application/guestbook/)
application using Pulumi.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init testbook
    ```

1.  This example will attempt to expose the guestbook application to the Internet with a `Service`
    of type `LoadBalancer`. Since minikube does not support `LoadBalancer`, the guestbook
    application already knows to use type `ClusterIP` instead; all you need to do is to tell it
    whether you're deploying to minikube:

    ```bash
    pulumi config set isMinikube <value>
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
    Updating (kubernetes-py-guestbook):
         Type                           Name                                             Status
     +   pulumi:pulumi:Stack            kubernetes-py-guestbook-kubernetes-py-guestbook  created
     +   ├─ kubernetes:core:Service     redis-leader                                     created
     +   ├─ kubernetes:core:Service     redis-replica                                    created
     +   ├─ kubernetes:core:Service     frontend                                         created
     +   ├─ kubernetes:apps:Deployment  redis-leader                                     created
     +   ├─ kubernetes:apps:Deployment  redis-replica                                    created
     +   └─ kubernetes:apps:Deployment  frontend                                         created

    Outputs:
        frontend_ip: "10.96.243.48"

    Resources:
        + 7 created
    ```

1.  Open the application in your browser to see the running application. If you're running macOS you
    can simply run:

    ```bash
    open $(pulumi stack output frontend_ip)
    ```

    > _Note_: minikube does not support type `LoadBalancer`; if you are deploying to minikube, make
    > sure to run `kubectl port-forward svc/frontend 8080:80` to forward the cluster port to the
    > local machine and access the service via `localhost:8080`.

    ![Guestbook in browser](./imgs/guestbook.png)

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
