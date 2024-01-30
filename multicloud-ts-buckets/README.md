[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/multicloud-ts-buckets/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/multicloud-ts-buckets/README.md#gh-dark-mode-only)

# AWS and GCP Resources

This example uses a single Pulumi program to provision resources in both AWS and GCP. It was
prepared by starting with the `aws-typescript` template, and then installing the `@pulumi/gcp`
package from NPM.

## Getting Started

Install prerequisites with:

```shell
$ npm install
```

Create a new stack:

```shell
$ pulumi stack init multicloud-aws-gcp
```

Configure the Pulumi program with the AWS region in which to deploy, and the GCP project ID:

```shell
$ pulumi config set aws:region us-east-1
$ pulumi config set gcp:project my-project-id
```

Run the program with `pulumi up`, with ambient AWS and GCP credentials available. The preview shows
resources will be created in both clouds. Confirm the update, and resources are created in each
cloud. The outputs show the name of the AWS and GCP buckets respectively.

```shell
$ pulumi up
Previewing update (multicloud-ts-buckets-dev):

     Type                   Name                                             Plan
 +   pulumi:pulumi:Stack    multicloud-ts-buckets-multicloud-ts-buckets-dev  create
 +   ├─ gcp:storage:Bucket  my-bucket                                        create
 +   └─ aws:s3:Bucket       my-bucket                                        create

Resources:
    3 changes
    + 3 to create

Do you want to perform this update? yes
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
    3 changes
    + 3 created

Duration: 21.713128552s

Permalink: https://app.pulumi.com/jen20/multicloud-ts-buckets-dev
```
