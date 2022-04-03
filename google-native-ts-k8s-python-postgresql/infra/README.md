# Containerized Python app, deployed to GKE via Pulumi

This example is a full end to end example of delivering a containerized Xpresso app.

The IaC part of this repo will take care of:

- Provisioning a Google Kubernetes Engine (GKE) cluster
- Provisioning a Cloud SQL managed PostgreSQL database
- Build a containerized Python app and pushes it to Google Artifact Registry (GAR)
- Deploys that the containerized app in the GKE cluster

## Quick Start

### Prerequisites

Before trying to deploy this example, please make sure you have performed all of the following tasks:

- [downloaded and installed the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).
- [downloaded and installed Docker](https://docs.docker.com/install/)
- [signed up for Google Cloud](https://cloud.google.com/free/)
- [followed the instructions here](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/) to connect Pulumi to your Google Cloud account.

This example assumes that you have Google Cloud's `gcloud` CLI on your path.
This is installed as part of the
[Google Cloud SDK](https://cloud.google.com/sdk/).

As part of this example, we will setup and deploy a Kubernetes cluster on GKE.
You may also want to install [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl) if you would like to directly interact with the underlying Kubernetes cluster.

### Set up your GCP Project

You'll need to create a new GCP project (or use an existing one).
Enable the following APIs in GCP if they are not already enabled:

- [Artifact Registry](https://cloud.google.com/artifact-registry/docs/enable-service#enable)
- [Kubernetes Engine](https://cloud.google.com/kubernetes-engine/docs/quickstart#before-you-begin)
- [Cloud SQL](https://cloud.google.com/sql/docs/mysql/admin-api#enable_the_api)

If you've configured `gcloud` locally and pointed it at your project you can run:

```shell
gcloud services enable artifactregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable container.googleapis.com
```

### Configure Docker

We'll be pushing a docker image to Artifact Registry, so configure docker for authentication:

```shell
gcloud auth configure-docker
```

### Configure Pulumi

Now you're ready to get started with the repo.
Clone the repo then cd into the infra directory:

```shell
cd infra
```

Now set up the Pulumi stack:

```shell
pulumi stack init dev
```

Set the required configuration variables for this program:

```shell
pulumi config set xpresso-gke-demo:projectId [your-gcp-project-here]
pulumi config set xpresso-gke-demo:region us-west1 # any valid region
pulumi config set xpresso-gke-demo:appPort 8000  # unless you change the app
```

### Deploy

Deploy everything with the `pulumi up` command.
This provisions all the GCP resources necessary, including your GKE cluster and database, as well as building and publishing your container image, all in a single gesture:

```shell
pulumi up
```

This will show you a preview, ask for confirmation, and then chug away at provisioning your cluster.

```shell
pulumi destroy
pulumi stack rm
```

### Check

If you log into the [GCP Console] and select your project, then go to `Kubernetes -> Workloads -> <the newly created deployment>` you'll find the public IP for your service.
