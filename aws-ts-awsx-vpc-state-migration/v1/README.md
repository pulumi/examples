[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/aws-ts-awsx-vpc-state-migration/v1)

# Creating the classic AWSX VPC

Create the starting VPC for the [component state migration example](../). The next stages adopt these same AWS resources.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/) version 3.264.0 or newer.
1. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/).
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/).

## Deploying the example

1. From this directory, create a stack on your chosen backend:

   ```bash
   pulumi stack init dev
   pulumi config set aws:region us-west-2
   pulumi config set availabilityZone us-west-2a
   pulumi install
   pulumi up
   ```

1. Save the important resource IDs in your shell for comparison after each migration:

   ```bash
   VPC_ID=$(pulumi stack output vpcId)
   SUBNET_IDS=$(pulumi stack output isolatedSubnetIds --json)
   SECURITY_GROUP_ID=$(pulumi stack output databaseSecurityGroupId)
   ```

1. Continue to [v2](../v2/) or migrate directly to [v3](../v3/), keeping the same shell, backend, project name, region, availability zone, and stack. Do not destroy v1 before migrating.

## Cleaning up

After finishing the walkthrough, run these commands from the last version you deployed:

```bash
pulumi destroy
pulumi stack rm
```

## Summary

You created the classic AWSX VPC that later stages migrate without replacing its AWS resources.
