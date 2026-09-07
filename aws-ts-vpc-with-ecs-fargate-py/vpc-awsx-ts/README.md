[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-vpc-with-ecs-fargate-py/vpc-awsx-ts/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-vpc-with-ecs-fargate-py/vpc-awsx-ts/README.md#gh-dark-mode-only)

# A VPC on AWS built in TypeScript

This example uses the Pulumi [AWSx](https://www.pulumi.com/docs/iac/guides/clouds/aws/) package for deploying your own VPC using the AWSx [VPC](https://www.pulumi.com/docs/iac/guides/clouds/aws/vpc/) component. The VPC is written in TypeScript, and its outputs are used as a [StackReference](https://www.pulumi.com/docs/intro/concepts/organizing-stacks-projects/#inter-stack-dependencies) by the [ecs-fargate-python](../ecs-fargate-python) project, showing that you can easily integrate infrastructure written in a different language than the one you're used to.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Create a new stack:

   ```bash
   pulumi stack init vpc-fargate-dev
   ```

1. Install dependencies:

   ```bash
   npm install
   ```

1. Set the configuration for the program. See the AWS [endpoints](https://docs.aws.amazon.com/general/latest/gr/rande.html) reference for valid regions:

   ```bash
   pulumi config set aws:region us-east-2
   pulumi config set vpc_name vpc-fargate-dev
   pulumi config set vpc_cidr 10.0.0.0/24
   pulumi config set zone_number 3
   ```

1. Deploy the stack:

   ```bash
   pulumi up
   ```

   ```
   Previewing update (vpc-fargate-dev)

        Type                              Name                           Plan
    +   pulumi:pulumi:Stack               awsx-vpc-vpc-fargate-dev       create...
    +   └─ awsx:x:ec2:Vpc                 vpc-fargate-dev                create
    ...

   Resources:
       + 44 to create
   ```

   Select `yes` to continue.

1. View the outputs. These are used as a [StackReference](https://www.pulumi.com/docs/intro/concepts/organizing-stacks-projects/#inter-stack-dependencies) by the ECS Fargate project in [ecs-fargate-python](../ecs-fargate-python):

   ```bash
   pulumi stack output
   ```

   ```
   Current stack outputs (8):
      OUTPUT                              VALUE
      pulumi_vpc_aws_tags                 {"Name":"vpc-fargate-dev",...}
      pulumi_vpc_az_zones                 3
      pulumi_vpc_cidr                     10.0.0.0/24
      pulumi_vpc_id                       vpc-0e1a5b4a8277fb720
      pulumi_vpc_name                     vpc-fargate-dev
      pulumi_vpc_private_subnet_ids       ["subnet-0d7d33f32765376aa","subnet-0697aa77c78831c8a","subnet-0e11a5c7b3bfae990"]
      pulumi_vpc_public_subnet_ids        ["subnet-0f09644bed84984e5","subnet-08f11730467a5a376","subnet-0eff65aac894f1115"]
      pulumic_vpc_number_of_nat_gateways  3
   ```

   The fully-qualified stack name (`org/project/stack`, for example `team-qa/awsx-vpc/vpc-fargate-dev`) is what you pass as the `mystackpath` config value in the ECS Fargate project. You can find it with `pulumi stack`.

## Cleaning up

Destroy the VPC only once there are no other resources running in it, such as the ECS Fargate cluster:

```bash
pulumi destroy
pulumi stack rm vpc-fargate-dev
```
