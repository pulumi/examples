[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-scheduled-function/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-scheduled-function/README.md#gh-dark-mode-only)

# Scheduled function on AWS

A simple function in AWS that executes based on a schedule using CloudWatch.

In this example, an S3 Bucket will be created. A function will run every Friday at 11:00pm UTC
that will delete all of the objects it contains.

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
    Updating (dev):

        Type                                          Name                           Status
    +   pulumi:pulumi:Stack                           aws-ts-scheduled-function-dev  created
    +   ├─ aws:cloudwatch:EventRuleEventSubscription  emptyTrash                     created
    +   │  ├─ aws:cloudwatch:EventRule                emptyTrash                     created
    +   │  ├─ aws:iam:Role                            emptyTrash                     created
    +   │  ├─ aws:iam:RolePolicyAttachment            emptyTrash-32be53a2            created
    +   │  ├─ aws:lambda:Function                     emptyTrash                     created
    +   │  ├─ aws:cloudwatch:EventTarget              emptyTrash                     created
    +   │  └─ aws:lambda:Permission                   emptyTrash                     created
    +   └─ aws:s3:Bucket                              trash                          created

    Outputs:
        bucketName: "trash-28693b6"

    Resources:
        + 9 created

    Duration: 16s
    ```

## Cleaning up

Once you're done, destroy the resources and remove the stack:

```bash
pulumi destroy
pulumi stack rm
```
