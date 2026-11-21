# Container delivery to GKE with Depot and Pulumi Delivery, in Java

This example uses [Pulumi Delivery](https://www.pulumi.com/docs/delivery/) to take a container image from a git push to a running beta environment on Google Cloud. Every push that touches this directory starts a pipeline run:

1. The **build** stage runs the `image` stack. It creates an Artifact Registry repository, builds the app in `app/` on [Depot](https://depot.dev/) with [Docker Build](https://www.pulumi.com/registry/packages/docker-build/), tags the image with the commit and pushes it.
2. The **beta** stage runs the `beta` stack with the image's digest reference, so it deploys exactly the image the build stage pushed. The stack creates a [GKE Autopilot](https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview) cluster and runs the image as a Kubernetes Deployment behind a LoadBalancer Service. A job then calls the service URL until the app answers.

The example has three Pulumi projects, all in Java and built with Maven, including the pipeline itself:

- [`pipeline/`](pipeline) defines the Delivery pipeline: a GitHub source, a `build` stage and a `beta` stage.
- [`image/`](image) creates an Artifact Registry repository, then builds the app in [`app/`](app) on Depot and pushes its image.
- [`beta/`](beta) runs that image on a GKE Autopilot cluster behind a load balancer and exports its URL.

Depot has no Pulumi provider. The `image` program runs `image/setup-builder.sh` with the [Command](https://www.pulumi.com/registry/packages/command/) provider, which installs a pinned, checksum-verified Depot CLI and registers the Depot buildx builder on the Docker daemon. Docker Build then builds on that builder. The same program works from your machine and on the Delivery runner.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/install/), version 3.277.0 or later, for `pulumi delivery register`.
1. [Install Java](https://www.pulumi.com/docs/languages-sdks/java/), JDK 21 or later, and [Maven](https://maven.apache.org/install.html).
1. A Pulumi Cloud organization with Pulumi Delivery enabled.
1. A GitHub repository that holds this example, either a fork of [pulumi/examples](https://github.com/pulumi/examples) or a copy of this directory in a repository of your own. Delivery runs every program from a checkout of that repository.
1. The [Pulumi GitHub App](https://www.pulumi.com/docs/integrations/version-control/github-app/) installed, with access to that repository. In Pulumi Cloud, go to **Settings** > **Version control**, open the GitHub installation, and choose **Configure repository access** to add it on GitHub.
1. A Google Cloud project with the Kubernetes Engine and Artifact Registry APIs enabled, and a [Pulumi ESC environment](https://www.pulumi.com/docs/esc/) that logs in to it with [OIDC](https://www.pulumi.com/docs/esc/integrations/dynamic-login-credentials/gcp-login/). The environment must set `GOOGLE_PROJECT` to the project ID, and `GOOGLE_OAUTH_ACCESS_TOKEN` to the login's access token, under `environmentVariables`. Its service account needs to create GKE clusters, Kubernetes workloads and Artifact Registry repositories, and to push images. The steps below call this environment `<project>/<gcp-env>`. The service account trusts each ESC environment by its exact name. If you reuse a workload identity pool and service account that already exist, grant this environment's subject `roles/iam.workloadIdentityUser` on the service account, following [Configuring OIDC for Google Cloud](https://www.pulumi.com/docs/esc/integrations/dynamic-login-credentials/gcp-login/).
1. A [Depot](https://depot.dev/) account with a project, and a [project token](https://depot.dev/docs/cli/authentication#project-tokens) for it.

## Setting up the pipeline

Run the commands below in order, in one shell, starting in this example's directory. They use `<org>` for your Pulumi organization.

1. Store the Depot project ID and token in an ESC environment. The `image` stack reads the project ID as Pulumi config and the token as the `DEPOT_TOKEN` environment variable:

    ```bash
    pulumi env init <org>/<project>/depot
    pulumi env set <org>/<project>/depot pulumiConfig.depotProjectId <depot-project-id>
    pulumi env set <org>/<project>/depot environmentVariables.DEPOT_TOKEN --secret -- "<depot-project-token>"
    ```

1. Create the two stacks that the pipeline updates, and point each at its ESC environments and region. Delivery does not create stacks, so they must exist before the first run.

    The project names in the three `Pulumi.yaml` files, the stack references in `pipeline/src/main/java/pipeline/App.java` and the Artifact Registry repository ID in `image/src/main/java/image/App.java` are fixed. A second deployment in the same Pulumi organization, or in the same Google Cloud project and region, must change them first, or it fails with a 409 "already exists" error. Use your names in the commands below.

    ```bash
    cd image
    pulumi stack init <org>/gcp-java-delivery-gke-depot-image/image
    pulumi config env add <project>/<gcp-env> --yes
    pulumi config env add <project>/depot --yes
    pulumi config set gcp:region us-central1
    cd ../beta
    pulumi stack init <org>/gcp-java-delivery-gke-depot-beta/beta
    pulumi config env add <project>/<gcp-env> --yes
    pulumi config set gcp:region us-central1
    cd ..
    ```

1. Commit the two stack files. Delivery runs every program from your repository, so each stack's `Pulumi.<stack>.yaml` must be in git. In a fork of `pulumi/examples`, these files are ignored, so add them with `-f`:

    ```bash
    git add -f image/Pulumi.image.yaml beta/Pulumi.beta.yaml
    git commit -m "Add stack files for the Delivery example"
    git push
    ```

1. Create the pipeline stack, point it at your repository, and tell Delivery where the pipeline program lives, with `delivery:source` in the stack config. The pipeline uses the Delivery SDK from Maven Central, [`com.pulumi:delivery`](https://central.sonatype.com/artifact/com.pulumi/delivery). Then commit and push everything:

    ```bash
    cd pipeline
    pulumi stack init <org>/gcp-java-delivery-gke-depot-pipeline/pipeline
    pulumi config set repository <owner>/<name>
    pulumi config set branch <branch>
    pulumi config set path <path>
    pulumi config set --path 'delivery:source.url' https://github.com/<owner>/<name>
    pulumi config set --path 'delivery:source.branch' <branch>
    pulumi config set --path 'delivery:source.directory' <path>/pipeline
    git add -f Pulumi.pipeline.yaml
    git commit -m "Point the Delivery pipeline at this repository"
    git push
    cd ..
    ```

    `repository` is your repository, as `<owner>/<name>`, and `branch` is the branch to watch. `path` is this example's directory within the repository, for example `gcp-java-delivery-gke-depot`. The example must live in a subdirectory: the pipeline starts runs for pushes that match `<path>/**`. With the example at the repository root (`path` of `.`), pushes update the pipeline but start no run.

1. Register the pipeline:

    ```bash
    cd pipeline
    pulumi delivery register
    cd ..
    ```

    A successful registration ends with `Registered the pipeline of <stack>` and a link to the pipeline. Its stages show as awaiting until the first run starts. Registration fails if the checkout has uncommitted changes or the commit is not on the branch in `delivery:source`.

1. Let the pipeline open the ESC environments. Registration creates a [service principal](https://www.pulumi.com/docs/delivery/concepts/identity/), named "Delivery gcp-java-delivery-gke-depot-pipeline pipeline", and gives it write access to the pipeline, image and beta stacks. The stacks run as that principal, so it also needs to open the Google Cloud and Depot environments they import. In Pulumi Cloud, open each environment, go to **Settings**, then **Access**, choose **Add Principal**, then **Service Principal**, pick the pipeline's service principal and give it **Environment Open**.

    Or from the command line:

    ```bash
    ./scripts/pulumi-env-access-grant <project>/<gcp-env> --principal "Delivery gcp-java-delivery-gke-depot-pipeline pipeline" --by-name --permission open
    ./scripts/pulumi-env-access-grant <project>/depot --principal "Delivery gcp-java-delivery-gke-depot-pipeline pipeline" --by-name --permission open
    ```

1. Start the first run: push a change to a file in this example, for example to the response text in `app/App.java`, or choose **Start a run** on the pipeline in Pulumi Cloud, under **Delivery** in your organization. Registration does not start a run.

1. Watch the run in Pulumi Cloud. The `build` stage pushes the image. The `beta` stage deploys it, then the `check-url` job requests the service URL until the app answers and records the URL and status as the job's outputs. The first run takes about 25 minutes, mostly to create the GKE cluster. Later runs take about 13. From now on, every push that changes files in this example starts a new run.

## Cleaning up

From this example's directory, destroy the stacks in reverse order and remove them. Each step runs only if the one before it succeeded:

```bash
(cd pipeline && pulumi destroy && pulumi stack rm) &&
  (cd beta && pulumi destroy && pulumi stack rm) &&
  (cd image && pulumi destroy && pulumi stack rm)
```

Destroying the beta stack deletes the GKE cluster. Destroying the image stack deletes the Artifact Registry repository and every image in it. Destroying the pipeline stack removes the pipeline's service principal and its access to the environments.

Remove the Depot environment from step 1 with `pulumi env rm <project>/depot`. If you created the Google Cloud environment only for this example, remove it with `pulumi env rm <project>/<gcp-env>`, along with any Google Cloud OIDC resources you created for it.

## Learn more

- [Pulumi Delivery](https://www.pulumi.com/docs/delivery/)
- [Pipeline identity in Pulumi Delivery](https://www.pulumi.com/docs/delivery/concepts/identity/)
- [GKE Autopilot](https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview)
- [Depot](https://depot.dev/docs)
