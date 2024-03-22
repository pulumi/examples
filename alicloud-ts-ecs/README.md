# Instance Using Alicloud ECS

[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/alicloud-ts-ecs/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/alicloud-ts-ecs/README.md#gh-dark-mode-only)

This example deploys a simple Alicloud ECS Instance

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Alicloud Credentials](https://www.pulumi.com/registry/packages/alicloud/installation-configuration/#configuring-credentials)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init
    ```

2. Set the required configuration variables for this program:

    ```bash
    pulumi config set alicloud:region us-east-1
    ```

3. Stand up the VM, which will also boot up your Python web server on port 80:

    ```bash
    pulumi up
    ```

4. After a couple of minutes, your VM will be ready, and one stack output is printed:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
    OUTPUT    VALUE
    publicIp  47.90.136.113
    ```

5. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your VM.

6. Afterward, destroy your stack and remove it:

    ```bash
    pulumi destroy --yes
    pulumi stack rm --yes
    ```
