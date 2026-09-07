[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/kubernetes-cs-guestbook/components#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/kubernetes-cs-guestbook/components#gh-dark-mode-only)

# Simple and component-based Kubernetes Guestbook apps

A port of the standard [Kubernetes Guestbook](https://kubernetes.io/docs/tutorials/stateless-application/guestbook/)
to Pulumi. This example shows you how to build and deploy a simple, multi-tier web application using Kubernetes and
Docker, and consists of three components:

* A single-instance Redis master to store guestbook entries
* Multiple replicated Redis instances to serve reads
* Multiple web frontend instances

This directory contains two variants of the guestbook, each a standalone Pulumi project with its own README:

- [simple/](./simple) — a straight port of the original YAML.
- [components/](./components) — demonstrates the benefits of using a real language, namely eliminating boilerplate through the use of real component abstractions.

Both variants provision the exact same Kubernetes guestbook application, but showcase different aspects of Pulumi. Follow the README in whichever sub-directory you choose.
