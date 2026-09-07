[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-secrets-manager/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-secrets-manager/README.md#gh-dark-mode-only)

# Set up AWS Secrets Manager

A simple program that creates an AWS secret and a version under AWS Secrets Manager.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev)

    View Live: https://app.pulumi.com/acmecorp/aws-py-secrets-manager/dev/updates/1

        Type                                 Name                        Status

    +   pulumi:pulumi:Stack                  aws-py-secrets-manager-dev  created
    +   ├─ aws:secretsmanager:Secret         secret_container            created
    +   └─ aws:secretsmanager:SecretVersion  secret_version              created

    Outputs:
        secret_id: "arn:aws:secretsmanager:us-east-1:xxxxxxxx:secret:secret_container-d07f0c4-N3OSrw"

    Resources: + 3 created

    Duration: 6s
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
