[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/multicloud-ts-buckets/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/multicloud-ts-buckets/README.md#gh-dark-mode-only)

# AWS and GCP resources

This example uses a single Pulumi program to provision resources in both AWS and GCP. It was
prepared by starting with the `aws-typescript` template, and then installing the `@pulumi/gcp`
package from NPM.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
4. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Install dependencies:

   ```bash
   npm install
   ```

1. Create a new stack:

   ```bash
   pulumi stack init multicloud-aws-gcp
   ```

1. Configure the Pulumi program with the AWS region in which to deploy, and the GCP project ID:

   ```bash
   pulumi config set aws:region us-east-1
   pulumi config set gcp:project my-project-id
   ```

1. Run the program with `pulumi up`, with ambient AWS and GCP credentials available. The preview shows
   resources will be created in both clouds. Confirm the update, and resources are created in each
   cloud. The outputs show the name of the AWS and GCP buckets respectively.

   ```bash
   pulumi up
   ```

   ```
   Updating (multicloud-ts-buckets-dev):

        Type                   Name                                             Status
    +   pulumi:pulumi:Stack    multicloud-ts-buckets-multicloud-ts-buckets-dev  created
    +   ├─ gcp:storage:Bucket  my-bucket                                        created
    +   └─ aws:s3:Bucket       my-bucket                                        created

   Outputs:
       bucketNames: [
           [0]: "my-bucket-c819937"
           [1]: "my-bucket-f722eb9"
       ]

   Resources:
       + 3 created

   Duration: 21.713128552s
   ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
