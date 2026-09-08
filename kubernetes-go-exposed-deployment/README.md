[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-go-exposed-deployment/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-go-exposed-deployment/README.md#gh-dark-mode-only)

# Exposing a deployment with a public IP address

Deploys `nginx` to a Kubernetes cluster, and publicly exposes it to the Internet with an IP address,
using a Kubernetes `Service`.

In the gif below we see the experience of deploying this example with `pulumi up`. Notice that
Pulumi has an inherent notion of "done-ness" -- Pulumi waits for the IP address to be allocated to
the `Service`. Because this example uses the Pulumi concept of _stack exports_ to report this IP
address, in this example we are also able to use `curl` to reach the `nginx` server.

![Allocating a public IP to a Deployment](images/deploy.gif "Allocating a public IP to a Deployment")

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init exposed-deployment-dev
    ```

1.  This example will attempt to expose the `nginx` deployment to the Internet with a `Service` of
    type `LoadBalancer`. Since minikube does not support `LoadBalancer`, the application already
    knows to use type `ClusterIP` instead; all you need to do is to tell it whether you're deploying
    to minikube:

    ```bash
    pulumi config set isMinikube <value>
    ```

1.  Install dependencies:

    ```bash
    go mod download
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating stack 'exposed-deployment-dev'
    Performing changes:

         Type                           Name                                       Status      Info
     +   pulumi:pulumi:Stack            exposed-deployment-exposed-deployment-dev  created     1 warning
     +   ├─ kubernetes:apps:Deployment  nginx                                      created
     +   └─ kubernetes:core:Service     nginx                                      created     2 info messages

    Diagnostics:
      kubernetes:core:Service: nginx
        info: ✅ Service 'nginx-rn6uipeg' successfully created endpoint objects

        info: ✅ Service has been allocated an IP

    ---outputs:---
    frontendIp: "35.226.79.225"

    info: 3 changes performed:
        + 3 resources created
    Update duration: 46.555593397s
    ```

1.  The `nginx` service was allocated a public IP, in this case `35.226.79.225`, exported as the
    stack output `frontendIp`. Use `curl` and `grep` to retrieve the `<title>` of the site:

    ```bash
    curl -sL $(pulumi stack output frontendIp) | grep "<title>"
    ```

    ```
    <title>Welcome to nginx!</title>
    ```

    > _Note_: minikube does not support type `LoadBalancer`; if you are deploying to minikube, make
    > sure to run `kubectl port-forward svc/frontend 8080:80` to forward the cluster port to the
    > local machine and access the service via `localhost:8080`.

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```

## Next steps

Now that `nginx` is deployed and exposed to the internet with an IP, try playing around with the
example!

If we change the `nginx` image to `nginx:1.16-alpine`, we can run `pulumi preview --diff` and see
this change reported to us:

![Diff](images/diff.gif "Reporting a diff after we change the app")

Notice also that if you provide an image that does not exist, Pulumi will report errors as it sees
them. You should see something similar in principle to this:

![Diff](images/error.gif "Error reporting")
