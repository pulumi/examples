[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/kubernetes-go-guestbook/simple)

# Simple and Component-based Kubernetes Guestbook Apps

A port of the standard [Kubernetes Guestbook](https://kubernetes.io/docs/tutorials/stateless-application/guestbook/)
to Pulumi. This example shows you how to build and deploy a simple, multi-tier web application using Kubernetes and
Docker, and consists of three components:

* A single-instance Redis master to store guestbook entries
* Multiple replicated Redis instances to serve reads
* Multiple web frontend instances

There is an [interactive Tutorial available](https://www.pulumi.com/docs/tutorials/kubernetes/guestbook/) for
this example. If this is your first time using Pulumi for Kubernetes, we recommend starting there.

In this directory, you will find two variants of the Guestbook:

1. [simple/](./simple) is a direct port of the original YAML.
2. [components](./components) demonstrates the benefits of using a real language, namely eliminating boilerplate through
   the use of real component abstractions.

Both examples provision the exact same Kubernetes Guestbook application, but showcase different aspects of Pulumi.
