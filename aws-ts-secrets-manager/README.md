[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-secrets-manager/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-secrets-manager/README.md#gh-dark-mode-only)

# Set up AWS Secrets Manager

A simple program that creates an AWS secret and a version under AWS Secrets Manager.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev)

    View Live: https://app.pulumi.com/acmecorp/aws-secrets-manager/dev/updates/1

        Type                                 Name                     Status
    +   pulumi:pulumi:Stack                  aws-secrets-manager-dev  created
    +   ├─ aws:secretsmanager:Secret         secretContainer          created
    +   └─ aws:secretsmanager:SecretVersion  secret                   created

    Outputs:
        secretContainerId: "arn:aws:secretsmanager:us-east-1:xxxxxxxx:secret:secretContainer-369b7ea-Wrt9Ba"

    Resources:
        + 3 created

    Duration: 8s
    ```

## Cleaning up

Once you're done, destroy the resources and remove the stack:

```bash
pulumi destroy
pulumi stack rm
```
