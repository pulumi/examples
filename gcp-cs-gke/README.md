[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-cs-gke/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-cs-gke/README.md#gh-dark-mode-only)

# Google Kubernetes Engine (GKE) cluster

This example deploys a Google Cloud Platform (GCP) [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/) cluster using C#.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)
4. [Install Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/downloads-interactive)
5. Configure GCP auth by logging in using `gcloud`:

    ```bash
    gcloud auth login
    gcloud config set project <YOUR_GCP_PROJECT_HERE>
    gcloud auth application-default login
    ```

    > Note: This auth mechanism is meant for inner loop developer workflows. If you want to run this example in an unattended service account setting, such as in CI/CD, please [follow instructions to configure your service account](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/). The service account must have the role `Kubernetes Engine Admin` / `container.admin`.

## Deploying the example

1.  Create a new Pulumi stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1.  Set the required GCP configuration variables:

    ```bash
    pulumi config set gcp:project <YOUR_GCP_PROJECT_HERE>
    pulumi config set gcp:zone us-west1-a
    ```

1.  Stand up the GKE cluster by running `pulumi up` and selecting "yes." Note that provisioning a new GKE cluster takes between 3-5 minutes. You can also run `pulumi up --diff` to see and inspect the diffs of the overall changes expected to take place.

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):

        Type                      Name            Plan
    +   pulumi:pulumi:Stack       gcp-cs-gke-dev  created
    +   └─ gcp:container:Cluster  helloworld      created

    Outputs:
        ClusterName: "helloworld-9b9530f"
        KubeConfig : "<KUBECONFIG_CONTENTS>"

    Resources:
        + 2 created

    Duration: 3m3s
    ```

1.  After 3-5 minutes, your cluster will be ready, and the kubeconfig JSON you'll use to connect to the cluster will be available as an output. To access your new Kubernetes cluster using `kubectl`, set up the `kubeconfig` file and use `kubectl`:

    ```bash
    pulumi stack output kubeconfig --show-secrets > kubeconfig
    export KUBECONFIG=$PWD/kubeconfig

    kubectl version
    kubectl cluster-info
    kubectl get nodes
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
