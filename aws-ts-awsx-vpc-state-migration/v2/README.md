[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/aws-ts-awsx-vpc-state-migration/v2)

# Migrating to the modern AWSX VPC

Replace the classic AWSX component with the provider-backed `awsx.ec2.Vpc`. The [migration](migration.ts) renames and reparents the retained states and folds the classic subnet and internet gateway wrappers into their managed children.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/) version 3.264.0 or newer.
1. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/).
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/).

## Deploying the example

1. Deploy v1 first to exercise a migration. The deploy button creates a fresh stack and therefore does not exercise prior-state migration.

1. From this directory, select that **existing stack on the same backend**. Use its fully qualified name if needed. Configuration files are local to each directory, so set the same region and availability zone again:

   ```bash
   pulumi stack select dev
   pulumi config set aws:region us-west-2
   pulumi config set availabilityZone us-west-2a
   pulumi install
   pulumi preview
   ```

1. Inspect the preview. The VPC, subnet, route table, association, internet gateway, and security group should be retained, with no creates, deletes, or replacements. An upgrade from classic AWSX can include in-place updates for provider defaults and tags. Preview runs the migration without persisting it.

1. Apply the migration and compare the outputs with the IDs saved in the v1 walkthrough:

   ```bash
   pulumi up
   test "$VPC_ID" = "$(pulumi stack output vpcId)"
   test "$SUBNET_IDS" = "$(pulumi stack output isolatedSubnetIds --json)"
   test "$SECURITY_GROUP_ID" = "$(pulumi stack output databaseSecurityGroupId)"
   pulumi preview --expect-no-changes
   ```

   The update persists the migrated checkpoint even if no provider operations are necessary. A subsequent preview should show no changes.

1. Continue to [v3](../v3/) to remove AWSX while retaining the same infrastructure.

## Cleaning up

After finishing the walkthrough, run these commands from the last version you deployed:

```bash
pulumi destroy
pulumi stack rm
```

## Summary

The component state migration changes the resource hierarchy while preserving physical resource identities and references from the security group outside the subtree.
