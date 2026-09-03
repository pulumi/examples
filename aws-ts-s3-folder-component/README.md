[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-s3-folder-component/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-s3-folder-component/README.md#gh-dark-mode-only)

# Static Website on Amazon S3 Using a Reusable Component

The component version of [aws-ts-s3-folder](../aws-ts-s3-folder/). This example wraps the same S3 static website in a reusable [`ComponentResource`](https://www.pulumi.com/docs/iac/concepts/resources/components/) that you can share with your team or the community.

A component is a logical container for physical cloud resources that controls how they are grouped in the CLI and the Pulumi Cloud console. To create one, subclass `pulumi.ComponentResource` (see [`s3folder.ts`](./s3folder.ts)):

- The call to `super("examples:S3Folder", name, {}, opts)` registers the component under a `namespace:className` type that appears in `pulumi up` and in Pulumi Cloud.
- Each child resource passes `{ parent: this }` so it nests under the component rather than the stack.
- The component exposes `bucketName` and `websiteUrl` as outputs and calls `registerOutputs` so consumers can correctly chain dependencies on them.

The program in [`index.ts`](./index.ts) then uses `S3Folder` like any other resource.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/install/)
1. [Configure Pulumi to access your AWS account](https://www.pulumi.com/registry/packages/aws/installation-configuration/)
1. [Install Node.js](https://nodejs.org/en/download/)

## Deploying and running the program

Note: some values in this example will be different from run to run. These values are indicated with `***`.

1.  Create a new stack:

    ```bash
    $ pulumi stack init website-component-testing
    ```

1.  Set the AWS region:

    ```bash
    $ pulumi config set aws:region us-west-2
    ```

1.  Restore NPM dependencies:

    ```bash
    $ npm install
    ```

1.  Run `pulumi up` to preview and deploy changes. After the preview is shown you will be
    prompted if you want to continue or not.

    ```bash
    $ pulumi up
    Previewing update (website-component-testing)

         Type                            Name                                                  Plan
     +   pulumi:pulumi:Stack             aws-ts-s3-folder-component-website-component-testing  create
     +   └─ examples:S3Folder            pulumi-static-site                                    create
     +      ├─ aws:s3:Bucket             pulumi-static-site                                    create
     +      ├─ aws:s3:BucketWebsiteConfiguration  pulumi-static-site-config                   create
     +      ├─ aws:s3:BucketPublicAccessBlock     pulumi-static-site-public-access-block      create
     +      ├─ aws:s3:BucketObject       index.html                                           create
     +      ├─ aws:s3:BucketObject       favicon.png                                          create
     +      └─ aws:s3:BucketPolicy       bucketPolicy                                          create

    Outputs:
        bucketName: "pulumi-static-site-***"
        websiteUrl: "pulumi-static-site-***.s3-website-us-west-2.amazonaws.com"

    Resources:
        + 7 to create
    ```

1.  To see the resources that were created, run `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (2):
        OUTPUT      VALUE
        bucketName  pulumi-static-site-***
        websiteUrl  pulumi-static-site-***.s3-website-us-west-2.amazonaws.com
    ```

1.  To see that the S3 objects exist, you can either use the AWS Console or the AWS CLI:

    ```bash
    $ aws s3 ls $(pulumi stack output bucketName)
    2024-04-20 22:52:15      13731 favicon.png
    2024-04-20 22:52:15        249 index.html
    ```

1.  Open the site URL in a browser to see both the rendered HTML and the favicon:

    ```bash
    $ pulumi stack output websiteUrl
    pulumi-static-site-***.s3-website-us-west-2.amazonaws.com
    ```

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.

## Summary

In this example you turned a static-website program into a reusable `S3Folder` component, deployed it, and exported the bucket name and website URL as stack outputs. From here you can package the component in its own module and reuse it across projects, or extend it to accept configuration such as the index document or a custom bucket policy.
