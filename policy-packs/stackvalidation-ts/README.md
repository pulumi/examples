# Stack validation example in TypeScript

This provides an example of a stack validation policy.
See [Policy as Code Core Concepts](https://www.pulumi.com/docs/guides/crossguard/core-concepts/) for more information.

In a nutshell, the key differences between stack validation policies and resource validation policies are:

* Stack validation policies can check resource outputs that are unknown to Pulumi until the provider creates the resource.
* Stack validation policies can run checks that cross the entire set of resources in the stack.

The example in this folder checks two things:

* S3 bucket region: Although a bit of a contrived example, the region is an output assigned by AWS and thus is not known before the resource is created and thus is not able to be tested in a resource validation policy.
* S3 bucket count: Checks the number of S3 buckets created in the stack. This is to show that a stack validation policy has access to the entire stack and not just individual resources like resource validation policies do.

## Using this policy pack

1. Set up the policy pack:

   ```bash
   mkdir stack-validation && cd stack-validation
   mkdir policy-pack && cd policy-pack
   ```

   Copy the stack validation policy pack into this directory, then install dependencies:

   ```bash
   npm i
   ```

1. Create a test project to run the policy against:

   ```bash
   mkdir ../test-project && cd ../test-project
   pulumi new aws-typescript
   ```

   Note that the Pulumi program and the policy do not need to be written in the same language. So, you can actually use `pulumi new aws-python` for the project and this policy will still work.

1. Set the AWS region (any region other than us-west-1, or change the policy accordingly):

   ```bash
   pulumi config set aws:region us-east-1
   ```

1. Edit `index.ts` and copy/paste the S3 bucket declaration so you are creating 2 buckets.

1. Run `pulumi up` with the policy pack to preview and then provision the resources:

   ```bash
   pulumi up --policy-pack ../policy-pack
   ```

   Note that the preview portion of the `pulumi up` will NOT trigger the "region" check but will trigger the "count" check. Once you enter `yes` and the resources are actually provisioned, then you will see the "region" check is triggered. This is because the bucket `region` property being checked in the policy is not known until AWS responds with the resource outputs.

1. Clean up your resources:

   ```bash
   pulumi destroy -y
   pulumi stack rm dev
   ```

## Learn more

- [Policy as Code ("CrossGuard")](https://www.pulumi.com/docs/guides/crossguard/)
- [Policy as Code Core Concepts](https://www.pulumi.com/docs/guides/crossguard/core-concepts/)
