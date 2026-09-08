[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-gke/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-gke/README.md#gh-dark-mode-only)

# Google Kubernetes Engine (GKE) with a canary deployment

This example provisions a [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/) cluster, using infrastructure-as-code, and then deploys a Kubernetes Deployment into it, to test that the cluster is working. This demonstrates that you can manage both the Kubernetes objects themselves, in addition to underlying cloud infrastructure, using a single configuration language (in this case, Python), tool, and workflow.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

This example assumes that you have GCP's `gcloud` CLI on your path. This is installed as part of the [GCP SDK](https://cloud.google.com/sdk/).

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the required configuration variables for this program:

    ```bash
    pulumi config set gcp:project [your-gcp-project-here]
    pulumi config set gcp:zone us-west1-a
    pulumi config set password --secret [your-cluster-password-here]
    pulumi config set master_version #any valid master version
    ```

    By default, your cluster will have 3 nodes of type `n1-standard-1`. This is configurable, however; for instance if you'd like to choose 5 nodes of type `n1-standard-2` instead, you can run these commands:

    ```bash
    pulumi config set node_count 5
    pulumi config set node_machine_type n1-standard-2
    ```

    This shows how stacks can be configurable in useful ways. You can even change these after provisioning.

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Deploy everything with the `pulumi up` command. This provisions all the GCP resources necessary, including your GKE cluster itself, and then deploys a Kubernetes Deployment running NGINX, all in a single gesture:

    ```bash
    pulumi up
    ```

    This will show you a preview, ask for confirmation, and then chug away at provisioning your cluster:

    ```
    Updating (dev)

         Type                            Name          Plan
     +   pulumi:pulumi:Stack             gcp-py-dev    create
     +   ├─ gcp:container:Cluster        gke-cluster   create
     +   ├─ pulumi:providers:kubernetes  gkeK8s        create
     +   └─ kubernetes:apps:Deployment   canary        create
     +   └─ kubernetes:core:Service      ingress       create

        Outputs:
        kubeConfig: "apiVersion: v1\n..."

    Resources:
        + 5 created

    Duration: 2m07s
    ```

    After about two minutes, your cluster will be ready, and its config will be printed.

1. From here, you may take this config and use it either in your `~/.kube/config` file, or just by saving it locally and plugging it into the `KUBECONFIG` envvar. All of your usual `gcloud` commands will work too, of course. For instance:

    ```bash
    pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
    KUBECONFIG=./kubeconfig.yaml kubectl get po
    ```

    ```
    NAME                              READY     STATUS    RESTARTS   AGE
    canary-n7wfhtrp-fdbfd897b-lrm58   1/1       Running   0          58s
    ```

1. At this point, you have a running cluster. Feel free to modify your program, and run `pulumi up` to redeploy changes. The Pulumi CLI automatically detects what has changed and makes the minimal edits necessary to accomplish these changes. This could be altering the existing chart, adding new GCP or Kubernetes resources, or anything, really.

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
