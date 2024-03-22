[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-synthetics-canary/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-synthetics-canary/README.md#gh-dark-mode-only)

# Deploy AWS Synthetics Canary Using a Local Script

An example of deploying an [AWS Synthetics Canary](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html) using a script stored locally.

This example does the following:
1. Zips up a colocated canary script.
1. Pushes the zip file to an S3 bucket.
1. Creates an IAM role and policy for the canary.
1. Deploys the canary.

The canary used in this example is a simple no-op script that writes a message.
See [Writing Canary Scripts](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_WritingCanary.html) for details regarding canary directory structure and naming conventions.
There are some prebaked canary scripts for doing things like checking an API or a link that can be found on AWS.

## Deploying and running the program

1.  Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-east-1
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.
    ```
    npm install
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (dev)
    ...

    Updating (dev)
    View Live: https://app.pulumi.com/acmecorp/aws-synthetics-canary/dev/updates/1

        Type                      Name                       Status
    +   pulumi:pulumi:Stack       aws-synthetics-canary-dev  created
    +   ├─ aws:s3:BucketV2        canary-results             created
    +   ├─ aws:s3:BucketV2        canary-scripts             created
    +   ├─ aws:iam:Role           canary-exec-role           created
    +   ├─ aws:iam:RolePolicy     canary-exec-policy         created
    +   ├─ aws:s3:BucketObjectv2  canary-simple-canary       created
    +   └─ aws:synthetics:Canary  canary-simple              created

    Outputs:
        canaryName   : "canary-simple-a4a3974"
        canaryNameArn: "arn:aws:synthetics:us-east-1:052848974346:canary:canary-simple-a4a3974"
    ```

## Clean up

1.  Run `pulumi destroy` to tear down all resources.

    NOTE: Until https://github.com/hashicorp/terraform-provider-aws/issues/19288 is addressed, the Canary's lambda function and related layers are left after the stack is destroyed. So you will want to manually clean up these items.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
