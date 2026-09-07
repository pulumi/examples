[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-containers-dockerbuild/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-containers-dockerbuild/README.md#gh-dark-mode-only)

# Deploy a container with a Docker Build image on AWS Fargate

Deploys an AWS Fargate service. The service uses a Docker image that is built with the Docker Build provider. The image is pushed to AWS ECR.

Last revision: July 2024.

This Pulumi example is also written as a template. If you prefer, you can copy it with `pulumi new` instead of cloning the repo:

```bash
pulumi new https://github.com/pulumi/examples/tree/master/aws-ts-containers-dockerbuild
```

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. [Install Docker](https://docs.docker.com/engine/installation/) with a default builder
5. *Recommended:* a [Pulumi Cloud account](https://app.pulumi.com/signup)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
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
