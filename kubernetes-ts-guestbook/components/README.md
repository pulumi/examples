# Kubernetes Guestbook (with Components)

A version of the [Kubernetes Guestbook](https://kubernetes.io/docs/tutorials/stateless-application/guestbook/)
application using Pulumi. Unlike [the straight port of the original YAML](../simple), this variant
leverages real code to eliminate boilerplate. A `ServiceDeployment` class is used that combines the common pattern
of deploying a container image using a Kubernetes `Deployment`, and then scaling it using a `Service`.

## Running the App

Follow the steps in [Pulumi Installation and Setup](https://pulumi.io/install/) and [Configuring Pulumi
Kubernetes](https://pulumi.io/reference/kubernetes.html#configuration) to get setup with Pulumi and Kubernetes.

Install dependencies:

```sh
npm install
```

Create a new stack:

```sh
$ pulumi stack init
Enter a stack name: testbook
```

This example will attempt to expose the Guestbook application to the Internet with a `Service` of
type `LoadBalancer`. Since minikube does not support `LoadBalancer`, the Guestbook application
already knows to use type `ClusterIP` instead; all you need to do is to tell it whether you're
deploying to minikube:

```sh
pulumi config set guestbook:isMinikube <value>
```

Perform the deployment:

```sh
$ pulumi up
Updating stack 'k8sjs-guestbook'
Performing changes:

     Type                                Name                Status      Info
 +   pulumi:pulumi:Stack                 guestbook-testbook  created
 +   ├─ k8sjs:service:ServiceDeployment  redis-master        created
 +   │  ├─ kubernetes:apps:Deployment    redis-master        created
 +   │  └─ kubernetes:core:Service       redis-master        created
 +   ├─ k8sjs:service:ServiceDeployment  redis-slave         created
 +   │  ├─ kubernetes:apps:Deployment    redis-slave         created
 +   │  └─ kubernetes:core:Service       redis-slave         created
 +   └─ k8sjs:service:ServiceDeployment  frontend            created
 +      ├─ kubernetes:apps:Deployment    frontend            created
 +      └─ kubernetes:core:Service       frontend            created

---outputs:---
frontendIp: "35.232.147.18"

info: 10 changes performed:
    + 10 resources created
Update duration: 18.829381902s

Permalink: https://app.pulumi.com/acmecorp/k8sjs-guestbook/updates/1
```

And finally - open the application in your browser to see the running application. If you're running
macOS you can simply run:

```sh
open $(pulumi stack output frontendIp)
```

> *Note*: minikube does not support type `LoadBalancer`; if you are deploying to minikube, make sure
> to run `kubectl port-forward svc/frontend 8080:80` to forward the cluster port to the local
> machine and access the service via `localhost:8080`.

![Guestbook in browser](./imgs/guestbook.png)
