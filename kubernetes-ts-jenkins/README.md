[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-jenkins/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-jenkins/README.md#gh-dark-mode-only)

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

Install dependencies:

```
$ npm install
```

Create a new stack:

```
$ pulumi stack init dev
```

Create configuration keys for the root username and password for the Jenkins instance we are
about to create:

```
$ pulumi config set username <your desired username>
$ pulumi config set password <your desired password> --secret
```

Preview the deployment of the application:

```
$ pulumi preview
Previewing update (dev):
     Type                                         Name                       Plan
 +   pulumi:pulumi:Stack                          kubernetes-ts-jenkins-dev  create
 +   └─ jenkins:jenkins:Instance                  dev                        create
 +      ├─ kubernetes:core:PersistentVolumeClaim  dev-pvc                    create
 +      ├─ kubernetes:core:Secret                 dev-secret                 create
 +      ├─ kubernetes:core:Service                dev-service                create
 +      └─ kubernetes:apps:Deployment             dev-deploy                 create

Resources:
    + 6 to create
```

Perform the deployment:

```
$ pulumi up --skip-preview
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

The deployment is complete! Use `pulumi stack output externalIp` to see the IP of the Service that we just deployed:

```
$ pulumi stack output externalIp
35.184.131.21
```

The Jenkins instance we just deployed is reachable through port 80 of the external IP address. You can now
visit `http://35.184.131.21/login` in a Web browser to begin the first-install flow for your new Jenkins instance.
You can use the username and password that you saved in your Pulumi config to log in to your new Jenkins instance.

> _Note_: If you are deploying to a cluster that does not support `type: "LoadBalancer"`, and deployed the example using
> `type: "ClusterIP"` instead, run `kubectl port-forward svc/jenkins 8080:80` to forward the cluster port to the local
> machine and access the service via `localhost:8080`.

When you're ready to be done with Jenkins, you can destroy the instance:

```
$ pulumi destroy
Do you want to perform this destroy? yes
Destroying (dev):
     Type                                         Name                       Status
 -   pulumi:pulumi:Stack                          kubernetes-ts-jenkins-dev  deleted
 -   └─ jenkins:jenkins:Instance                  dev                        deleted
 -      ├─ kubernetes:core:Secret                 dev-secret                 deleted
 -      ├─ kubernetes:core:PersistentVolumeClaim  dev-pvc                    deleted
 -      ├─ kubernetes:core:Service                dev-service                deleted
 -      └─ kubernetes:apps:Deployment             dev-deploy                 deleted

Outputs:
  - externalIp: "35.184.131.21"

Resources:
    - 6 deleted

Duration: 36s
```
