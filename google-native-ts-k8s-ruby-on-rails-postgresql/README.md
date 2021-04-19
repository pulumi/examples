[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/gcp-ts-k8s-ruby-on-rails-postgresql/infra)

# Containerized Ruby on Rails App Delivery using the Google Native Pulumi Provider

This example is a full end to end example of delivering a containerized Ruby on Rails application. It

-   Provisions a [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/) cluster
-   Provisions a fully managed Google Cloud SQL PostgreSQL database
-   Builds a containerized Ruby on Rails container image, and publishes it to the Google Container Registry
-   Deploys that container image as a Kubernetes Service inside of the provisioned GKE cluster

All of these happen behind a single `pulumi up` command, and are expressed in just a handful of TypeScript.

## Prerequisites

Before trying to deploy this example, please make sure you have performed all of the following tasks:
-  [downloaded and installed the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).
-  [downloaded and installed Docker](https://docs.docker.com/install/)
-  [signed up for Google Cloud](https://cloud.google.com/free/)
-  [followed the instructions here](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/) to connect Pulumi to your Google Cloud account.

This example assumes that you have Google Cloud's `gcloud` CLI on your path. This is installed as part of the
[Google Cloud SDK](https://cloud.google.com/sdk/).

As part of this example, we will setup and deploy a Kubernetes cluster on GKE. You may also want to install [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl) if you would like to directly interact with the underlying Kubernetes cluster.

## Running the Example

After cloning this repo, `cd infra/` and run these commands. After 8 minutes, you'll have a fully functioning GKE
cluster and containerized Ruby on Rails application deployed into it, using a hosted PostgreSQL instance!

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init dev
    ```

2. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set google-native:project [your-gcp-project-here]
    $ pulumi config set google-native:region us-west1 # any valid region
    ```

    Since we will use Google's Container Registry for hosting the Docker image, we need to configure your machine's Docker to be able to authenticate with GCR:

    ```bash
    $ gcloud auth configure-docker # Configure docker to be able to push to your Google project's container registry
    ```

    The following configuration variables have defaults or are automatically generated when not specified but can be explicitly specified as follows:

    ```bash
    $ pulumi config set clusterPassword --secret [your-new-cluster-password-here] # must be at least 16 characters
    $ pulumi config set dbUsername [your-new-db-username-here]
    $ pulumi config set dbPassword --secret [your-new-db-password-here]
    $ pulumi config set masterVersion # any valid master version, or latest
    ```

    Config variables that use the `--secret` flag are [encrypted and not stored as plaintext](https://www.pulumi.com/docs/intro/concepts/config/#secrets).

    By default, your cluster will use the default nodepool. `index.ts` includes a reference incantation to enable an additional nodepool 
    which can be configured as follows:
    ```bash
    $ pulumi config set clusterNodeCount 5
    $ pulumi config set clusterNodeMachineType n1-standard-2
    ```

    You can even change these after provisioning.

3. Deploy everything with the `pulumi up` command. This provisions all the GCP resources necessary, including
   your GKE cluster and database, as well as building and publishing your container image, all in a single gesture:

    ```bash
    $ pulumi up
    ```

    This will show you a preview, ask for confirmation, and then chug away at provisioning your cluster:

    ```
    Updating stack 'google-rails-dev'
    Performing changes:

     Type                                           Name                        Plan       Info
 +   pulumi:pulumi:Stack                            google-rails-dev            create
 +   ├─ docker:image:Image                          rails-app                   create
 +   ├─ google-native:container/v1:Cluster          cluster                     create     
 +   ├─ google-native:sqladmin/v1beta4:Instance     web-db                      create     
 +   ├─ google-native:container/v1:ClusterNodePool  primary-node-pool           create     
 +   ├─ pulumi:providers:kubernetes                 gke-k8s                     create     
 +   ├─ gcp:sql:User                                web-db-user                 create     
 +   ├─ kubernetes:apps/v1:Deployment               rails-deployment            create     
 +   └─ kubernetes:core/v1:Service                  rails-service               create     
    Diagnostics:
      docker:image:Image (rails-app):
        Building container image: context=../app
        logging in to registry...

        Sending build context to Docker daemon  22.79MB
        Step 1/9 : FROM ruby:2.5
         ---> 8e2b5b80415f
    ...

        ---outputs:---
        appAddress: "http://32.233.14.89:3000"
        appName   : "rails-deployment-vt7uyigk"
        dbAddress : "36.223.156.57"
        kubeConfig: "apiVersion: v1\n..."

    info: 8 changes
        + 8 created
    Update duration: 7m20.867501974as
    ```

    After this completes, numerous outputs will show up. `appAddress` is the URL that your Rails app will be available
    at, `appName` is the resulting Kubernetes Deployment, `dbAddress` is your PostgreSQL hostname in case you want to
    connect to it with `psql`, and `kubeConfig` is the full Kubernetes configuration that you can use with `kubectl`.

4. Open a browser to visit the site, `open $(pulumi stack output appAddress)/todo_lists`. Make some todo lists!

5. At this point, you have a running cluster. Feel free to modify your program, and run `pulumi up` to redeploy changes.
   The Pulumi CLI automatically detects what has changed and makes the minimal edits necessary to accomplish these
   changes. This could be altering the app code, adding new Google Cloud or Kubernetes resources, or anything, really.

6. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
