# Stack Validation Example - python
This provides an example of a stack validation policy.
See [Policy as Code Core Concepts](https://www.pulumi.com/docs/guides/crossguard/core-concepts/) for more information.

In a nutshell, the key differences between stack validation policies and resource validation policies are:
* Stack validation policies can check resource outputs that are unknown to Pulumi until the provider creates the resource.
* Stack validation policies can run checks that cross the entire set of resources in the stack.

The example in this folder checks two things:
* S3 bucket region: Although a bit of a contrived example, the region is an output assigned by AWS and thus is not known before the resource is created and thus is not able to be tested in a resource validation policy.
* S3 bucket count: Checks the number of S3 buckets created in the stack. This is to show that a stack validation policy has access to the entire stack and not just individual resources like resource valiation policies do.

To try it out, you can use `pulumi new` to create a base AWS example - any language can be used.
To trigger the policies, use a region other than us-west-1,
add a second bucket declaration (or a for-loop) to launch more than 1 bucket.