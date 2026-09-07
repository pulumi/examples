[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-synthetics-canary/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-synthetics-canary/README.md#gh-dark-mode-only)

# Deploy AWS Synthetics Canary using a local script

An example of deploying an [AWS Synthetics Canary](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html) using a script stored locally.

This example does the following:
1. Zips up a colocated canary script.
1. Pushes the zip file to an S3 bucket.
1. Creates an IAM role and policy for the canary.
1. Deploys the canary.

The canary used in this example is a simple no-op script that writes a message.
See [Writing Canary Scripts](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_WritingCanary.html) for details regarding canary directory structure and naming conventions.
There are some prebaked canary scripts for doing things like checking an API or a link that can be found on AWS.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
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
    Previewing update (dev)
    ...

    Updating (dev)
    View Live: https://app.pulumi.com/acmecorp/aws-synthetics-canary/dev/updates/1

        Type                      Name                       Status
    +   pulumi:pulumi:Stack       aws-synthetics-canary-dev  created
    +   ├─ aws:s3:Bucket          canary-results             created
    +   ├─ aws:s3:Bucket          canary-scripts             created
    +   ├─ aws:iam:Role           canary-exec-role           created
    +   ├─ aws:iam:RolePolicy     canary-exec-policy         created
    +   ├─ aws:s3:BucketObjectv2  canary-simple-canary       created
    +   └─ aws:synthetics:Canary  canary-simple              created

    Outputs:
        canaryName   : "canary-simple-a4a3974"
        canaryNameArn: "arn:aws:synthetics:us-east-1:052848974346:canary:canary-simple-a4a3974"
    ```

## Cleaning up

Once you're done, destroy the resources and remove the stack:

```bash
pulumi destroy
pulumi stack rm
```

> **Note:** Until https://github.com/hashicorp/terraform-provider-aws/issues/19288 is addressed, the Canary's lambda function and related layers are left after the stack is destroyed, so you will want to manually clean up these items.
