[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-containers-dockerbuildcloud/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-containers-dockerbuildcloud/README.md#gh-dark-mode-only)

# Deploy a container with a DBC-built image on AWS Fargate

Deploys an AWS Fargate service. The service uses a Docker image that is built with Docker Build Cloud (DBC). The image is pushed to AWS ECR. This template prompts the user for an existing DBC builder.

Last revision: May 2024.

This Pulumi example is also written as a template. If you prefer, you can copy it with `pulumi new` instead of cloning the repo:

```bash
pulumi new https://github.com/pulumi/examples/tree/master/aws-ts-containers-dockerbuildcloud
```

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. A [Docker Build Cloud (DBC) builder](https://build.docker.com/) — you **must** complete the [DBC builder setup steps](https://docs.docker.com/build/cloud/setup/#steps)
5. Docker Desktop / CLI
6. *Recommended:* a [Pulumi Cloud account](https://app.pulumi.com/signup)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1.  Set your existing Docker Build Cloud builder (e.g., `cloud-pulumi-my-cool-builder`):

    ```bash
    pulumi config set builder <your-dbc-builder>
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

1.  Confirm the service is up and running:

    ```bash
    curl $(pulumi stack output url)
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring further charges:

```bash
pulumi destroy
pulumi stack rm
```
