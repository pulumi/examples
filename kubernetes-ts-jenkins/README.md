[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-jenkins/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-jenkins/README.md#gh-dark-mode-only)

# Continuous integration with Jenkins

This example deploys a container running the Jenkins continuous integration system onto a running
Kubernetes cluster using Pulumi and `@pulumi/kubernetes`.

> _Note_: The code in this repo assumes you are deploying to a cluster that supports the
> [`LoadBalancer`](https://kubernetes.io/docs/concepts/services-networking/service/#type-loadbalancer) service type.
> This includes most cloud providers as well as [Docker for Mac Edge w/
> Kubernetes](https://docs.docker.com/docker-for-mac/kubernetes/).

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Create configuration keys for the root username and password for the Jenkins instance we are
    about to create:

    ```bash
    pulumi config set username <your desired username>
    pulumi config set password <your desired password> --secret
    ```

1.  Set the minikube values. [MetalLB](https://metallb.io/) is required for `LoadBalancer` services on
    minikube. You will either need to enable it yourself with `minikube addons enable metallb` or set
    `enableMetalLB` to `true`:

    ```bash
    pulumi config set isMinikube true # set to false if you are not using minikube
    pulumi config set enableMetalLB true
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
    Updating (dev):
         Type                                         Name                       Status
     +   pulumi:pulumi:Stack                          kubernetes-ts-jenkins-dev  created
     +   └─ jenkins:jenkins:Instance                  dev                        created
     +      ├─ kubernetes:core:Secret                 dev-secret                 created
     +      ├─ kubernetes:core:Service                dev-service                created
     +      ├─ kubernetes:core:PersistentVolumeClaim  dev-pvc                    created
     +      └─ kubernetes:apps:Deployment             dev-deploy                 created

    Outputs:
        externalIp: "35.184.131.21"

    Resources:
        + 6 created

    Duration: 1m58s
    ```

1.  The deployment is complete! Use `pulumi stack output externalIp` to see the IP of the Service that we just deployed:

    ```bash
    pulumi stack output externalIp
    ```

    ```
    35.184.131.21
    ```

    The Jenkins instance we just deployed is reachable through port 80 of the external IP address. You can now
    visit `http://35.184.131.21/login` in a web browser to begin the first-install flow for your new Jenkins instance.
    You can use the username and password that you saved in your Pulumi config to log in to your new Jenkins instance.

    > _Note_: If you are deploying to a cluster that does not support `type: "LoadBalancer"`, and deployed the example using
    > `type: "ClusterIP"` instead, run `kubectl port-forward svc/jenkins 8080:80` to forward the cluster port to the local
    > machine and access the service via `localhost:8080`.

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
