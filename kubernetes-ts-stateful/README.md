# Run a stateful Cassandra cluster on Kubernetes

A Pulumi-fied version of the [Kubernetes
Cassandra](https://kubernetes.io/docs/tutorials/stateful-application/cassandra/) example. This
example deploys a replicated Nginx server to a Kubernetes cluster, using TypeScript and no YAML.

There is an [interactive Tutorial available](https://pulumi.io/quickstart/kubernetes/tutorial-stateless-app.html) for
this example. If this is your first time using Pulumi for Kubernetes, we recommend starting there.

## Pre-Requisites

1. [Install Pulumi](https://pulumi.io/install/)
2. [Configure Kubernetes for Pulumi](https://pulumi.io/quickstart/kubernetes/setup.html)

## Running the App

After cloning this repo, `cd` into this directory and install dependencies:

```sh
npm install
```

Afterwards, create a new stack, a logical deployment target that we'll deploy into:

```sh
$ pulumi stack init
Enter a stack name: cassandra
```

Now to perform the deployment, simply run `pulumi up`. It will first show you a preview of what will take place.
After confirming, the deployment will take place in approximately 20 seconds:

```sh
$ pulumi up
Updating stack 'cassandra'
Performing changes:

     Type                            Name                          Status      Info
 +   pulumi:pulumi:Stack             stateful-cassandra-cassandra  created
 +   └─ kubernetes:apps:StatefulSet  cassandra                     created

info: 2 changes performed:
    + 2 resources created
Update duration: 18.291517072s
```

This deployment is now running, and you can run commands like `kubectl get pods` to see the application's resources.

After we're done, we can tear down all resources, including removing our stack, with a couple commands:

```sh
$ pulumi destroy --yes
$ pulumi stack rm --yes
```
