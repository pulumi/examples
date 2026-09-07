[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/alicloud-ts-ecs/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/alicloud-ts-ecs/README.md#gh-dark-mode-only)

# Instance using Alicloud ECS

This example deploys a simple Alicloud ECS instance.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Alicloud Credentials](https://www.pulumi.com/registry/packages/alicloud/installation-configuration/#configuring-credentials)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init
    ```

1.  Set the Alicloud region to deploy into:

    ```bash
    pulumi config set alicloud:region us-east-1
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack, which will also boot up your Python web server on port 80:

    ```bash
    pulumi up
    ```

1.  After a couple of minutes, your VM will be ready, and one stack output is printed:

    ```bash
    pulumi stack output
    ```

    ```
    Current stack outputs (1):
    OUTPUT    VALUE
    publicIp  47.90.136.113
    ```

From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your VM.

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
