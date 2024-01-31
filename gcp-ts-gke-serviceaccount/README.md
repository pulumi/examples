[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-gke-serviceaccount/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-gke-serviceaccount/README.md#gh-dark-mode-only)

# Google Kubernetes Engine (GKE) Cluster with Service Account

This example deploys an Google Cloud Platform (GCP) [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/) cluster, and deploys an example application that consumes a PubSub topic. The cluster has a secret which contains [Google Cloud Service Account Credentials](https://cloud.google.com/iam/docs/service-accounts)

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Install Node.js](https://nodejs.org/en/download/)
1. Install a package manager for Node.js, such as [npm](https://www.npmjs.com/get-npm) or [Yarn](https://yarnpkg.com/en/docs/install).
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

1. Install the required Node.js packages:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```bash
    $ npm install
    ```

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

1. Set some optional configuration variables (note, these values are optional and have defaults set):

    ```bash
    $ pulumi config set name <NAME>
    $ pulumi config set machineType n1-standard-1
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

    ```

1. After 3-5 minutes, your cluster will be ready, and the kubeconfig YAML you'll use to connect to the cluster will
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

1. Verify the pubsub example is working

    The pubsub deployment should be running, you can check it by examining the logs:

    ```bash
    k logs -n pubsub -l appClass=pubsub
    Pulling messages from Pub/Sub subscription...
    ```

1. Once you've finished, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
