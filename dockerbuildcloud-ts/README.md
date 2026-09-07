[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/dockerbuildcloud-ts/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/dockerbuildcloud-ts/README.md#gh-dark-mode-only)

# Build a Docker image with Docker Build Cloud (DBC)

Builds a Docker image from a local NGINX Dockerfile using Docker Build Cloud (DBC). This template prompts you for an existing DBC builder.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
3. A [Docker Build Cloud (DBC) builder](https://build.docker.com/) — you **must** complete the [DBC builder setup steps](https://docs.docker.com/build/cloud/setup/#steps)
4. Docker Desktop / CLI
5. *Recommended*: a [Pulumi Cloud account](https://app.pulumi.com/signup)

## Deploying the example

This Pulumi example is written as a template. It is meant to be copied via `pulumi new` as follows:

```bash
pulumi new https://github.com/pulumi/examples/tree/master/dockerbuildcloud-ts
npm install
```

Once copied to your machine, feel free to edit as needed.

1.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1.  Set the name of your existing (and configured) cloud builder:

    ```bash
    pulumi config set builder cloud-pulumi-my-cool-builder
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy your infrastructure by running `pulumi up` and selecting "yes" to confirm the expected changes:

    ```bash
    pulumi up
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
