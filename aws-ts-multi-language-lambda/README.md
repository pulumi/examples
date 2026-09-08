[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-multi-language-lambda/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-multi-language-lambda/README.md#gh-dark-mode-only)

# Building and bundling Lambda dependencies

This example shows how to install dependencies and build multiple Lambda functions in different languages and then deploy the results.

You don't need to install any languages other than Node.js because we'll use Docker containers to build the code.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
1. [Install Docker](https://docs.docker.com/get-docker/)

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

    Once all the resources have deployed, you can run the Lambdas and see the outputs.

## Cleaning up

Once you're finished, destroy the resources and remove the stack:

```bash
pulumi destroy
pulumi stack rm
```