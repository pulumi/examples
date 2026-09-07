[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/kubernetes-go-guestbook/components#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/kubernetes-go-guestbook/components#gh-dark-mode-only)

# Simple and component-based Kubernetes Guestbook apps

A port of the standard [Kubernetes Guestbook](https://kubernetes.io/docs/tutorials/stateless-application/guestbook/)
to Pulumi. This example shows you how to build and deploy a simple, multi-tier web application using Kubernetes and
Docker, and consists of three components:

* A single-instance Redis master to store guestbook entries
* Multiple replicated Redis instances to serve reads
* Multiple web frontend instances

There is an [interactive Tutorial available](https://www.pulumi.com/docs/tutorials/kubernetes/guestbook/) for
this example. If this is your first time using Pulumi for Kubernetes, we recommend starting there.

This directory contains two variants of the guestbook, each a standalone Pulumi project with its own README:

- [simple/](./simple) — a direct port of the original YAML.
- [components/](./components) — demonstrates the benefits of using a real language, namely eliminating boilerplate through the use of real component abstractions.

Both variants provision the exact same Kubernetes guestbook application, but showcase different aspects of Pulumi. Follow the README in whichever sub-directory you choose.
