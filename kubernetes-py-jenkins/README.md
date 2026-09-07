[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-jenkins/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-jenkins/README.md#gh-dark-mode-only)

# Continuous integration with Jenkins

This example deploys a container running the Jenkins continuous integration system onto a running
Kubernetes cluster using Pulumi and `@pulumi/kubernetes`.

> _Note_: The code in this repo assumes you are deploying to a cluster that supports the
> [`LoadBalancer`](https://kubernetes.io/docs/concepts/services-networking/service/#type-loadbalancer) service type.
> This includes most cloud providers as well as [Docker for Mac Edge w/
> Kubernetes](https://docs.docker.com/docker-for-mac/kubernetes/). If not (for example if you are targeting `minikube`
> or your own custom Kubernetes cluster), replace `type: "LoadBalancer"` with `type: "ClusterIP"` in `jenkins.py`. See
> the Kubernetes [Services
> docs](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services---service-types) for more
> details.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the root username and password for the Jenkins instance you are about to create:

    ```bash
    pulumi config set username <your desired username>
    pulumi config set password <your desired password> --secret
    ```

1.  Configure Kubernetes to run without minikube:

    ```bash
    pulumi config set isMinikube false
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
         Type                                         Name                       Status
     +   pulumi:pulumi:Stack                          kubernetes-py-jenkins-dev  created
     +   └─ jenkins:jenkins:Instance                  dev                        created
     +      ├─ kubernetes:core:PersistentVolumeClaim  dev-pvc                    created
     +      ├─ kubernetes:core:Service                dev-service                created
     +      ├─ kubernetes:core:Secret                 dev-secret                 created
     +      └─ kubernetes:apps:Deployment             dev-deploy                 created

    Outputs:
        external_ip: "35.239.72.50"

    Resources:
        + 6 created

    Duration: 1m57s
    ```

1.  The deployment is complete! Use `pulumi stack output external_ip` to see the IP of the service
    you just deployed:

    ```bash
    pulumi stack output external_ip
    ```

    ```
    35.239.72.50
    ```

    The Jenkins instance is reachable through port 80 of the external IP address. You can now visit
    `http://35.239.72.50/login` in a web browser to begin the first-install flow for your new Jenkins
    instance. Use the username and password that you saved in your Pulumi config to log in.

    > _Note_: If you are deploying to a cluster that does not support `type: "LoadBalancer"`, and deployed the example using
    > `type: "ClusterIP"` instead, run `kubectl port-forward svc/jenkins 8080:80` to forward the cluster port to the local
    > machine and access the service via `localhost:8080`.

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
