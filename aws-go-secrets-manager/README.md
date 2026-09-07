[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-secrets-manager/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-secrets-manager/README.md#gh-dark-mode-only)

# Set up AWS Secrets Manager

A simple program that creates an AWS secret and a version under AWS Secrets Manager.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1.  Install dependencies:

    ```bash
    go mod download
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev)

    View Live: https://app.pulumi.com/acmecorp/aws-go-secrets-manager/dev/updates/1

        Type                                 Name                        Status
    +   pulumi:pulumi:Stack                  aws-go-secrets-manager-dev  created
    +   ├─ aws:secretsmanager:Secret         secretcontainer             created
    +   └─ aws:secretsmanager:SecretVersion  secret                      created

    Outputs:
        secretContainer: "arn:aws:secretsmanager:us-east-1:xxxxxxxx:secret:secretcontainer-562188f-67Rt8n"

    Resources:
        + 3 created

    Duration: 11s
    ```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
