[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-landing-zone/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-landing-zone/README.md#gh-dark-mode-only)

# AWS Landing Zone

The foundational, shared resources a single AWS account needs before any workload lands on top of it. Deploy this once per account, then have every downstream Pulumi project consume its outputs (via a [StackReference](https://www.pulumi.com/docs/concepts/stack/#stackreferences)) instead of re-creating the same plumbing.

The `LandingZone` component provisions:

- A **VPC** across two availability zones, with public and private subnets, an internet gateway, and per-AZ NAT gateways.
- A **KMS customer-managed key** (with rotation) and a key policy that lets CloudWatch Logs and CloudTrail use it.
- **VPC flow logs** delivered to an encrypted CloudWatch log group.
- **Deployer** (`PowerUserAccess`) and **read-only** (`ReadOnlyAccess`) IAM roles that a trusted principal can assume.
- An encrypted, multi-region **CloudTrail** audit trail writing to a lifecycle-managed S3 bucket.

The companion example [`aws-ts-serverless-react-postgres`](../aws-ts-serverless-react-postgres) consumes this stack's `networkId`, `privateSubnetIds`, and `secretsStore` outputs.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure your AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying and running the program

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region:

    ```bash
    pulumi config set aws:region us-west-2
    ```

    Optionally override the VPC CIDR block or the principal trusted to assume the roles:

    ```bash
    pulumi config set cidrBlock 10.10.0.0/16
    pulumi config set trustedPrincipalArn arn:aws:iam::123456789012:root
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Run `pulumi up` to preview and deploy:

    ```bash
    pulumi up
    ```

1.  Inspect the outputs downstream stacks will reference:

    ```bash
    pulumi stack output
    ```

    ```
    Current stack outputs (9):
        OUTPUT                  VALUE
        auditBucket             platform-audit-***
        dataEncryptionKeyAlias  alias/platform-landing-zone
        dataEncryptionKeyArn    arn:aws:kms:us-west-2:***
        deployerRoleArn         arn:aws:iam::***:role/platform-deployer
        networkId               vpc-***
        privateSubnetIds        ["subnet-***","subnet-***"]
        publicSubnetIds         ["subnet-***","subnet-***"]
        readOnlyRoleArn         arn:aws:iam::***:role/platform-readonly
        secretsStore            platform/
    ```

## Clean up

To tear down the resources, run:

```bash
pulumi destroy
pulumi stack rm
```

## Summary

In this example you deployed a reusable AWS landing zone: network, encryption, audit logging, and workload identities that every project in the account can share. Reference its outputs from your application stacks with a `StackReference` to keep foundational infrastructure in one place.
