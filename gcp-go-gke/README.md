[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-go-gke/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-go-gke/README.md#gh-dark-mode-only)

# Google Kubernetes Engine (GKE) cluster

This example deploys a Google Cloud Platform (GCP) [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/) cluster and an application to it.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)
4. [Install the Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/downloads-interactive)
5. Configure GCP auth by logging in with `gcloud`:

    ```bash
    gcloud auth login
    gcloud config set project <YOUR_GCP_PROJECT_HERE>
    gcloud auth application-default login
    ```

    > Note: This auth mechanism is meant for inner loop developer workflows. If you want to run this example in an unattended service account setting, such as in CI/CD, please [follow instructions to configure your service account](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/). The service account must have the role `Kubernetes Engine Admin` / `container.admin`.

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the required GCP configuration variables:

    ```bash
    pulumi config set gcp:project <YOUR_GCP_PROJECT_HERE>
    pulumi config set gcp:zone us-west1-a
    ```

1. Install dependencies:

    ```bash
    go mod download
    ```

1. Stand up the GKE cluster by running `pulumi up`. Note that provisioning a new GKE cluster takes between 3-5 minutes:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):

        Type                      Name            Plan
    +   pulumi:pulumi:Stack       gcp-go-gke-dev  created
    +   └─ gcp:container:Cluster  helloworld      created

    Outputs:
        ClusterName: "helloworld-9b9530f"
        KubeConfig : "<KUBECONFIG_CONTENTS>"

    Resources:
        + 2 created

    Duration: 3m3s
    ```

1. After 3-5 minutes, your cluster will be ready, and the kubeconfig JSON you'll use to connect to the cluster will be available as an output.

1. Access the Kubernetes cluster using `kubectl`. Set up the `kubeconfig` file from the Pulumi stack output, then run your usual `kubectl` commands:

    ```bash
    pulumi stack output kubeconfig --show-secrets > kubeconfig
    export KUBECONFIG=$PWD/kubeconfig

    kubectl version
    kubectl cluster-info
    kubectl get nodes
    ```

## Cleaning up

Once you're finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
