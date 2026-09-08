[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-webserver/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-webserver/README.md#gh-dark-mode-only)

# Web server using Amazon EC2

This example deploys a simple AWS EC2 virtual machine running a Python web server.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init
    ```

1. Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1. Install dependencies:

    ```bash
    npm install
    ```

1. Stand up the VM, which will also boot up your Python web server on port 80:

    ```bash
    pulumi up
    ```

1. After a couple minutes, your VM will be ready, and two stack outputs are printed:

    ```bash
    pulumi stack output
    ```

    ```
    Current stack outputs (2):
    OUTPUT          VALUE
    publicHostName  ec2-53-40-227-82.compute-1.amazonaws.com
    publicIp        53.40.227.82
    ```

1. Thanks to the security group making port 80 accessible to the 0.0.0.0/0 CIDR block (all addresses), we can curl it:

    ```bash
    curl $(pulumi stack output publicIp)
    ```

    ```
    Hello, World!
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your VM.

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it:

```bash
pulumi destroy --yes
pulumi stack rm --yes
```
