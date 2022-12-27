# Containerized Python Xpresso app, deployed to GKE via Pulumi

This example is a full end to end example of delivering a containerized Xpresso app.

Using an infrastructure as code approach, running this repo will:

- Provision a GKE cluster
- Provisions a fully managed Google Cloud SQL PostgreSQL database
- Builds a containerized Xpresso app, and it to the Google Artifact Registry
- Deploys that container image as a Kubernetes Service inside of the provisioned GKE cluster

## Prerequisites

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

## Deploying the Example

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
pulumi confit set xpresso-gke-demo:appPort 8000  # unless you change the app
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

## Local Development

This package comes set up with some basic facilities for local development:

- Make targets for bootstrapping, testing and linting
- Git hooks (via [pre-commit](https://pre-commit.com)) to do code formatting and syncing of derived files

To set up locally you'll need to have Python 3.10 installed.
If you're using [pyenv](https://github.com/pyenv/pyenv), remember to select the right Python version.

### Bootstrapping

Run:

```shell
make init
```

This will:

- Create a virtual environment using [Poetry](https://python-poetry.org) and install all of the app's dependencies.
- Install git hooks via pre-commit.

### Testing

Run:

```shell
make test
```

### Linting

Linting will auto-run on each commit.
To disable this for a single commit, run:

```shell
git commit -m "<commit message>" --no-verify
```

To disable this permanently:

```shell
poetry run pre-commit --uninstall
```

To run linting manually (without committing):

```shell
make lint
```

### Versioning

So that we can include info about the project version in our infra (in particular, we want the version in the image tag) we keep the source of truth in a `VERSION.txt` file.
This is also convenient to programmatically check for version bumps (for example in CI).

This version is synced to the Python package version (in `pyproject.toml`) via a pre-commit hook.

### Dependency specification

Dependencies are specified in `pyproject.toml` and managed by Poetry.
But we don't want to have to install Poetry to build the image, so we export Poetry's lockfile to a `app/requirements.txt` via a pre-commit hook.
Then when we build the image we can just `pip install -r app/requirements.txt`.
