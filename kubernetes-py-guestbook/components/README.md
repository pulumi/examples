[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-guestbook/components/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-guestbook/components/README.md#gh-dark-mode-only)

# Kubernetes Guestbook (components variant)

A version of the [Kubernetes Guestbook](https://kubernetes.io/docs/tutorials/stateless-application/guestbook/)
application using Pulumi. Unlike [the straight port of the original YAML](../simple), this variant
leverages real code to eliminate boilerplate. A `ServiceDeployment` class is used that combines the common pattern
of deploying a container image using a Kubernetes `Deployment`, and then scaling it using a `Service`.

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
    Updating (guestbook):

         Type                                 Name                      Status
     +   pulumi:pulumi:Stack                  guestbook-easy-guestbook  created
     +   ├─ k8sx:component:ServiceDeployment  redis-leader              created
     +   │  ├─ kubernetes:apps:Deployment     redis-leader              created
     +   │  └─ kubernetes:core:Service        redis-leader              created
     +   ├─ k8sx:component:ServiceDeployment  frontend                  created
     +   │  ├─ kubernetes:apps:Deployment     frontend                  created
     +   │  └─ kubernetes:core:Service        frontend                  created
     +   └─ k8sx:component:ServiceDeployment  redis-replica             created
     +      ├─ kubernetes:apps:Deployment     redis-replica             created
     +      └─ kubernetes:core:Service        redis-replica             created

    Outputs:
        frontend_ip: "10.105.48.30"

    Resources:
        + 10 created

    Duration: 21s
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
