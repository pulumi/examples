# gcp-ts-gke-knative
All-in-one demo of Knative on GKE

**Not intended for production use**

This demo was adapted from the 
[Knative installation guide](https://www.knative.dev/docs/install/knative-with-gke/#creating-a-kubernetes-cluster)
for GKE and the related
[example app](https://www.knative.dev/docs/install/getting-started-knative-app/)

**Important Note**
This demo creates a 3-node GKE cluster with `n1-standard-4` instances.
Remember to tear down these resources after use to avoid unwanted charges.

## Prerequisites

* GCP account configured with the `Kubernetes Engine Cluster Admin` role

## Known issues:

1. Stack operations get very slow with so many resources in one stack.
Splitting the deployment into  multiple stacks (e.g., GKE cluster,
Istio/Knative, app) solves this problem, and is more representative
of production use.

1. `pulumi destroy` fails with an error:
`  kubernetes:apiextensions.k8s.io:CustomResourceDefinition (routes.serving.knative.dev):
     error: Plan apply failed: Resource operation was cancelled for 'routes.serving.knative.dev'`
This can be worked around with the following:
```
$ URN=$(pulumi stack --show-urns | grep routes.serving.knative.dev | grep URN: | awk '{print $2}')

$ pulumi state delete $URN
 warning: This command will edit your stack's state directly. Confirm? Yes
Resource deleted successfully

# Run pulumi destroy again to finish cleaning up stack
$ pulumi destroy --skip-preview
```
