[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-jenkins/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-jenkins/README.md#gh-dark-mode-only)

# Continuous Integration with Jenkins

This example deploys a container running the Jenkins continuous integration system onto a running
Kubernetes cluster using Pulumi and `@pulumi/kubernetes`.

## Running the App

Follow the steps in [Pulumi Installation and Setup](https://www.pulumi.com/docs/get-started/install/) and [Configuring Pulumi
Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/) to get setup with Pulumi and Kubernetes.

> _Note_: The code in this repo assumes you are deploying to a cluster that supports the
> [`LoadBalancer`](https://kubernetes.io/docs/concepts/services-networking/service/#type-loadbalancer) service type.
> This includes most cloud providers as well as [Docker for Mac Edge w/
> Kubernetes](https://docs.docker.com/docker-for-mac/kubernetes/). If not (for example if you are targeting `minikube`
> or your own custom Kubernetes cluster), replace `type: "LoadBalancer"` with `type: "ClusterIP"` in `jenkins.ts`. See
> the Kubernetes [Services
> docs](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services---service-types) for more
> details.

Create a new stack:

```bash
    $ pulumi stack init dev
```

Create configuration keys for the root username and password for the Jenkins instance we are
about to create:

```bash
    $ pulumi config set username <your desired username>
    $ pulumi config set password <your desired password> --secret
```

Configure Kubernetes to run without Minikube:

```bash
    $ pulumi config set isMinikube false
```

Preview the deployment of the application:

```bash
    $ pulumi preview
    Previewing update (dev):
         Type                                         Name                       Plan
     +   pulumi:pulumi:Stack                          kubernetes-py-jenkins-dev  create
     +   └─ jenkins:jenkins:Instance                  dev                        create
     +      ├─ kubernetes:core:Service                dev-service                create
     +      ├─ kubernetes:core:PersistentVolumeClaim  dev-pvc                    create
     +      ├─ kubernetes:core:Secret                 dev-secret                 create
     +      └─ kubernetes:apps:Deployment             dev-deploy                 create

    Resources:
        + 6 to create
```

Perform the deployment:

```bash
    $ pulumi up --skip-preview
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

The deployment is complete! Use `pulumi stack output external_ip` to see the IP of the Service that we just deployed:

```bash
    $ pulumi stack output external_ip
    35.239.72.50
```

The Jenkins instance we just deployed is reachable through port 80 of the external IP address. You can now
visit `http://35.239.72.50/login` in a Web browser to begin the first-install flow for your new Jenkins instance.
You can use the username and password that you saved in your Pulumi config to log in to your new Jenkins instance.

> _Note_: If you are deploying to a cluster that does not support `type: "LoadBalancer"`, and deployed the example using
> `type: "ClusterIP"` instead, run `kubectl port-forward svc/jenkins 8080:80` to forward the cluster port to the local
> machine and access the service via `localhost:8080`.

When you're ready to be done with Jenkins, you can destroy the instance:

```bash
    $ pulumi destroy
        Destroying (dev):
         Type                                         Name                       Status
     -   pulumi:pulumi:Stack                          kubernetes-py-jenkins-dev  deleted
     -   └─ jenkins:jenkins:Instance                  dev                        deleted
     -      ├─ kubernetes:core:Secret                 dev-secret                 deleted
     -      ├─ kubernetes:core:Service                dev-service                deleted
     -      ├─ kubernetes:core:PersistentVolumeClaim  dev-pvc                    deleted
     -      └─ kubernetes:apps:Deployment             dev-deploy                 deleted

    Outputs:
      - external_ip: "35.239.72.50"

    Resources:
        - 6 deleted

    Duration: 33s
```
