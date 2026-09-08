[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/gcp-ts-docker-gcr-cloudrun/docker-build-push-gcr#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/gcp-ts-docker-gcr-cloudrun/docker-build-push-gcr#gh-dark-mode-only)

# Docker build and push to GCR and deploy to Google Cloud Run using separate projects

An example of building a custom Docker image and pushing it into a Google Cloud Container Registry and then in a separate project deploying that image with the Google Cloud Run service using TypeScript.

> Note this is an adaptation of the [gcp-ts-cloudrun example](../gcp-ts-cloudrun).

This example is split into two Pulumi projects, run in sequence:

- [docker-build-push-gcr/](./docker-build-push-gcr) — builds a custom Docker image and pushes it to Google Container Registry (GCR).
- [cloud-run-deploy/](./cloud-run-deploy) — deploys that image from GCR to Google Cloud Run.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. [Install Docker](https://docs.docker.com/get-docker/)
5. Enable Docker to deploy to Google Container Registry with `gcloud auth configure-docker`
6. [Set up Docker auth with a JSON key to get the image from GCR](https://cloud.google.com/container-registry/docs/advanced-authentication#json-key)

## Building and pushing the Docker image

1.  Navigate to the `docker-build-push-gcr` directory.

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

4.  Configure your GCP project and region:

    ```bash
    pulumi config set gcp:project <projectname>
    pulumi config set gcp:region <region>
    ```

5.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Previewing update (dev):
    ...

    Updating (dev):
        Type                   Name                 Status
    +   pulumi:pulumi:Stack    gcr-build-image-dev  created
    +   └─ docker:image:Image  ruby-app             created

    Outputs:
        digest: "gcr.io/velvety-rock-274215/ruby-app:latest-fee86d3d35fccf2ad4d86bbfcdd489acf7b1e4db0ebb8166378bd1fb0ca9cee6"

    Resources:
        + 2 created

    Duration: 16s
    ```

## Deploying to Cloud Run

1.  Navigate to the `cloud-run-deploy` directory.

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

4.  Configure your GCP project, region, and Docker config file:

    ```bash
    pulumi config set gcp:project <projectname>
    pulumi config set gcp:region <region>
    pulumi config set docker-config-file <location of ~/.docker/config.json>
    ```

5.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Previewing update (dev):
        Type                         Name                   Plan
    +   pulumi:pulumi:Stack          cloud-run-deploy-dev   create
    +   ├─ pulumi:providers:docker   gcr                    create
    +   ├─ docker:index:RemoteImage  ruby-app-docker-image  create
    +   ├─ gcp:cloudrun:Service      ruby                   create
    +   └─ gcp:cloudrun:IamMember    ruby-everyone          create

    Resources:
        + 5 to create

    Do you want to perform this update? yes
    Updating (dev):
        Type                         Name                   Status
    +   pulumi:pulumi:Stack          cloud-run-deploy-dev   created
    +   ├─ pulumi:providers:docker   gcr                    created
    +   ├─ docker:index:RemoteImage  ruby-app-docker-image  created
    +   ├─ gcp:cloudrun:Service      ruby                   created
    +   └─ gcp:cloudrun:IamMember    ruby-everyone          created

    Outputs:
        rubyUrl: "https://ruby-app-7a54c5f5e006d5cf33c2-zgms4nzdba-uc.a.run.app"

    Resources:
        + 5 created

    Duration: 23s
    ```

6.  Check the deployed Cloud Run endpoint:

    ```bash
    curl "$(pulumi stack output rubyUrl)"
    ```

    ```
    Hello Pulumi!
    ```

## Cleaning up

Once you're finished experimenting, destroy your stacks and remove them to avoid incurring any additional cost. Run these commands in both the `docker-build-push-gcr` and `cloud-run-deploy` directories:

```bash
pulumi destroy
pulumi stack rm
```
