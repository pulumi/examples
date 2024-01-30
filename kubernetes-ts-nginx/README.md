[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-nginx/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-nginx/README.md#gh-dark-mode-only)

# Stateless Application Using a Deployment

A version of the [Kubernetes Stateless Application Deployment](
https://kubernetes.io/docs/tasks/run-application/run-stateless-application-deployment/) example that uses Pulumi.
This example deploys a replicated Nginx server to a Kubernetes cluster, using TypeScript and no YAML.

There is an [interactive Tutorial available](https://www.pulumi.com/docs/tutorials/kubernetes/stateless-app/) for
this example. If this is your first time using Pulumi for Kubernetes, we recommend starting there.

## Pre-Requisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes for Pulumi](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)

## Running the App

After cloning this repo, `cd` into this directory and install dependencies:

```sh
npm install
```

Afterwards, create a new stack, a logical deployment target that we'll deploy into:

```sh
$ pulumi stack init
Enter a stack name: k8s-nginx-dev
```

Now to perform the deployment, simply run `pulumi up`. It will first show you a preview of what will take place.
After confirming, the deployment will take place in approximately 20 seconds:

```sh
$ pulumi up
Updating stack 'k8s-nginx-dev'
Performing changes:

     Type                           Name                     Status      Info
 +   pulumi:pulumi:Stack            k8s-nginx-k8s-nginx-dev  created
 +   └─ kubernetes:apps:Deployment  nginx                    created

info: 2 changes performed:
    + 2 resources created
Update duration: 18.291517072s
```

This deployment is now running, and you can run commands like `kubectl get pods` to see the application's resources.

The stack's replica count is configurable. By default, it will scale up to three instances, but we can easily change
that to five, by running the `pulumi config` command followed by another `pulumi up`:

```sh
$ pulumi config set replicas 5
$ pulumi up
Updating stack 'k8s-nginx-dev'
Performing changes:

     Type                           Name                     Status      Info
 *   pulumi:pulumi:Stack            k8s-nginx-k8s-nginx-dev  done
 ~   └─ kubernetes:apps:Deployment  nginx                    updated     changes: ~ spec

info: 1 change performed:
    ~ 1 resource updated
      1 resource unchanged
Update duration: 4.324849549s
```

After we're done, we can tear down all resources, including removing our stack, with a couple commands:

```sh
$ pulumi destroy --yes
$ pulumi stack rm --yes
```
