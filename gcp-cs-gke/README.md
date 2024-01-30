[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-cs-gke/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-cs-gke/README.md#gh-dark-mode-only)

# Google Kubernetes Engine (GKE) Cluster

This example deploys an Google Cloud Platform (GCP) [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/) cluster using CSharp.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Install .NET Core 3.0+](https://dotnet.microsoft.com/download)
1. [Install Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/downloads-interactive)
1. Configure GCP Auth

    * Login using `gcloud`

        ```bash
        $ gcloud auth login
        $ gcloud config set project <YOUR_GCP_PROJECT_HERE>
        $ gcloud auth application-default login
        ```
    > Note: This auth mechanism is meant for inner loop developer
    > workflows. If you want to run this example in an unattended service
    > account setting, such as in CI/CD, please [follow instructions to
    > configure your service account](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/). The
    > service account must have the role `Kubernetes Engine Admin` / `container.admin`.

### Steps

After cloning this repo, from this working directory, run these commands:

1. Create a new Pulumi stack, which is an isolated deployment target for this example:

    This will initialize the Pulumi program in TypeScript.

    ```bash
    $ pulumi stack init
    ```

1. Set the required GCP configuration variables:

    This sets configuration options and default values for our cluster.

    ```bash
    $ pulumi config set gcp:project <YOUR_GCP_PROJECT_HERE>
    $ pulumi config set gcp:zone us-west1-a     // any valid GCP Zone here
    ```

1. Stand up the GKE cluster:

    To preview and deploy changes, run `pulumi update` and select "yes."

    The `update` sub-command shows a preview of the resources that will be created
    and prompts on whether to proceed with the deployment. Note that the stack
    itself is counted as a resource, though it does not correspond
    to a physical cloud resource.

    You can also run `pulumi up --diff` to see and inspect the diffs of the
    overall changes expected to take place.

    Running `pulumi up` will deploy the GKE cluster. Note, provisioning a
    new GKE cluster takes between 3-5 minutes.

    ```bash
    $ pulumi update
	Previewing update (dev):

        Type                      Name            Plan
    +   pulumi:pulumi:Stack       gcp-cs-gke-dev  create
    +   └─ gcp:container:Cluster  helloworld      create

	Resources:
        + 2 to create

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

1. After 3-5 minutes, your cluster will be ready, and the kubeconfig JSON you'll use to connect to the cluster will
   be available as an output.

1. Access the Kubernetes Cluster using `kubectl`

    To access your new Kubernetes cluster using `kubectl`, we need to setup the
    `kubeconfig` file and download `kubectl`. We can leverage the Pulumi
    stack output in the CLI, as Pulumi facilitates exporting these objects for us.

    ```bash
    $ pulumi stack output kubeconfig --show-secrets > kubeconfig
    $ export KUBECONFIG=$PWD/kubeconfig

    $ kubectl version
    $ kubectl cluster-info
    $ kubectl get nodes
    ```

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
