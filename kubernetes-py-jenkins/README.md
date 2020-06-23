[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

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

```bash
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
```

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
    Previewing update of stack 'dev'
        Type    Name    Status        Info
    *   global  global  unchanged
    Previewing changes:

        Type                                            Name                                             Status        Info
    *   global                                          global                                           no change
    +   pulumi:pulumi:Stack                             kubernetes-py-jenkins-dev                        create
    +   └─ jenkins:jenkins:Instance                     dev                                              create
    +      ├─ kubernetes:core:v1:Secret                 dev-secret                                       create
    +      ├─ kubernetes:core:v1:PersistentVolumeClaim  dev-pvc                                          create
    +      ├─ kubernetes:core:v1:Service                dev-service                                      create
    +      └─ kubernetes:extensions:v1beta1:Deployment  dev-deploy                                       create

    info: 6 changes previewed:
        + 6 resources to create
```

Perform the deployment:

```bash
    $ pulumi up --skip-preview
    Updating stack 'dev'
        Type    Name    Status        Info
    *   global  global  unchanged
    Performing changes:

        Type                                            Name                                             Status        Info
    *   global                                          global                                           unchanged
    +   pulumi:pulumi:Stack                             kubernetes-py-jenkins-dev                        created
    +   └─ jenkins:jenkins:Instance                     dev                                              created
    +      ├─ kubernetes:core:v1:Secret                 dev-secret                                       created
    +      ├─ kubernetes:core:v1:PersistentVolumeClaim  dev-pvc                                          created
    +      ├─ kubernetes:core:v1:Service                dev-service                                      created
    +      └─ kubernetes:extensions:v1beta1:Deployment  dev-deploy                                       created

    info: 6 changes performed:
        + 6 resources created
    Update duration: 2m30.397621136s
```

The deployment is complete! Use `kubectl` to see the Service that we just deployed:

```bash
    $ kubectl get services
    NAME         TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)                      AGE
    dev          LoadBalancer   10.43.241.251   35.230.56.127   80:30638/TCP,443:30204/TCP   3m
```

The Jenkins instance we just deployed is reachable through port 80 of the external IP address. You can now
visit `http://35.230.56.127/jenkins/login` in a Web browser to begin the first-install flow for your new Jenkins instance.
You can use the username and password that you saved in your Pulumi config to log in to your new Jenkins instance.

> _Note_: If you are deploying to a cluster that does not support `type: "LoadBalancer"`, and deployed the example using
> `type: "ClusterIP"` instead, run `kubectl port-forward svc/jenkins 8080:80` to forward the cluster port to the local
> machine and access the service via `localhost:8080`.

When you're ready to be done with Jenkins, you can destroy the instance:

```bash
    $ pulumi destroy
    Do you want to perform this destroy? yes
    Destroying stack 'dev'
    Performing changes:

        Type                                            Name                                             Status      Info
    -   pulumi:pulumi:Stack                             kubernetes-py-jenkins-dev                        deleted
    -   └─ jenkins:jenkins:Instance                     dev                                              deleted
    -      ├─ kubernetes:extensions:v1beta1:Deployment  dev-deploy                                       deleted
    -      ├─ kubernetes:core:v1:Service                dev-service                                      deleted
    -      ├─ kubernetes:core:v1:PersistentVolumeClaim  dev-pvc                                          deleted
    -      └─ kubernetes:core:v1:Secret                 dev-secret                                       deleted

    info: 6 changes performed:
        - 6 resources deleted
    Update duration: 18.202009282s
```
