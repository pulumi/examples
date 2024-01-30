[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-vpc-with-ecs-fargate-py/vpc-crosswalk-ts/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-vpc-with-ecs-fargate-py/vpc-crosswalk-ts/README.md#gh-dark-mode-only)

# Pulumi:  A VPC on AWS built in Typescript.

### What Is This?

This example uses [Pulumi CrossWalk for AWS](https://www.pulumi.com/docs/guides/crosswalk/aws/#pulumi-crosswalk-for-aws) for deploying your own vpc using crosswalk [VPC](https://www.pulumi.com/docs/guides/crosswalk/aws/vpc/).  The VPC is built in `typescript`

### Why would you do this?
An example showing that you can easily integrate infrastructure from another Pulumi application written in a different language than the one you are used to.

## Prerequisites

* [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Configure Pulumi to Use AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is configured, no further changes are required)

### Where are the settings?
 The settings are in `Pulumi`.stackname`.yaml`
 You will be creating a new file that holds your configs

### Creating a new `Pulumi`.stackname`.yaml`

 1. Initialize a new stack called: `vpc-fargate` via [pulumi stack init](https://www.pulumi.com/docs/reference/cli/pulumi_stack_init/).
      ```
      $ pulumi stack init vpc-fargate-dev
      ```

2. Now, install dependencies:

   ```
   $ npm install
   ```
3. View the current config settings. This will be empty.
   ```
   $ pulumi config
   ```
   ```
   KEY                     VALUE
   ```
3. Populate the config.

   Here are aws [endpoints](https://docs.aws.amazon.com/general/latest/gr/rande.html)
   ```
   $ pulumi config set aws:region us-east-2 # any valid aws region endpoint
   $ pulumi config set vpc_name vpc-fargate-dev
   $ pulumi config set vpc_cidr 10.0.0.0/24
   $ pulumi config set zone_number 3 # number of availability zones
   $ pulumi config set number_of_nat_gateways 3 # number of nat gateways. 1 to N(where N is zone_number). recommended to keep at least 2 for high availability.
   ```

4. View the current config settings
   ```$ pulumi config```
   ```
   KEY                     VALUE
   aws:region              us-east-2
   number_of_nat_gateways  3
   vpc_cidr                10.0.0.0/24
   vpc_name                vpc-fargate-dev
   zone_number             3
   ```

5. Launch
 ```$ pulumi up```

6. Expected output:

```
Previewing update (vpc-fargate-dev)

View Live: https://app.pulumi.com/shaht/crosswalk-vpc/vpc-fargate-dev/previews/0da8c31d-5cb4-4fee-9a3d-69d9d5d21511

     Type                              Name                           Plan
 +   pulumi:pulumi:Stack               crosswalk-vpc-vpc-fargate-dev  create...
 +   └─ awsx:x:ec2:Vpc                 vpc-fargate-dev                create
 +      ├─ awsx:x:ec2:Subnet           vpc-fargate-dev-public-2       create
 +      │  ├─ aws:ec2:RouteTable       vpc-fargate-dev-public-2       create
 +      │  └─ aws:ec2:Subnet           vpc-fargate-dev-public-2       create
 +      ├─ awsx:x:ec2:Subnet           vpc-fargate-dev-private-2      create
 +      │  ├─ aws:ec2:RouteTable       vpc-fargate-dev-private-2      create
 +      │  ├─ aws:ec2:RouteTable       vpc-fargate-dev-private-2      create
 +      │  ├─ aws:ec2:Subnet                 vpc-fargate-dev-private-2      create
 +      │  └─ aws:ec2:RouteTableAssociation  vpc-fargate-dev-private-2      create
 +      ├─ awsx:x:ec2:Subnet                 vpc-fargate-dev-public-1       create
 +      ├─ awsx:x:ec2:Subnet                 vpc-fargate-dev-public-1       create
 +      │  └─ aws:ec2:RouteTableAssociation  vpc-fargate-dev-public-2       create
 +      │  ├─ aws:ec2:Subnet                 vpc-fargate-dev-public-1       create
 +      │  ├─ aws:ec2:Route                  vpc-fargate-dev-public-1-ig    create
 +      │  └─ aws:ec2:RouteTableAssociation  vpc-fargate-dev-public-1       create
 +      ├─ awsx:x:ec2:Subnet                 vpc-fargate-dev-private-1      create
 +      │  ├─ aws:ec2:RouteTable             vpc-fargate-dev-private-1        create
 +      │  ├─ aws:ec2:RouteTable             vpc-fargate-dev-private-1        create
 +      │  └─ aws:ec2:Route                  vpc-fargate-dev-private-2-nat-2  create
 +   pulumi:pulumi:Stack                     crosswalk-vpc-vpc-fargate-dev    create
 +      │  └─ aws:ec2:Route                  vpc-fargate-dev-private-1-nat-1  create
 +      ├─ awsx:x:ec2:NatGateway             vpc-fargate-dev-0                create
 +      │  ├─ aws:ec2:Eip                    vpc-fargate-dev-0                create
 +      │  └─ aws:ec2:NatGateway             vpc-fargate-dev-0                create
 +      ├─ awsx:x:ec2:Subnet                 vpc-fargate-dev-public-0         create
 +      │  ├─ aws:ec2:RouteTable             vpc-fargate-dev-public-0         create
 +      │  ├─ aws:ec2:Subnet                 vpc-fargate-dev-public-0         create
 +      │  ├─ aws:ec2:Route                  vpc-fargate-dev-public-0-ig      create
 +      │  └─ aws:ec2:RouteTableAssociation  vpc-fargate-dev-public-0         create
 +      ├─ awsx:x:ec2:NatGateway             vpc-fargate-dev-2                create
 +      │  ├─ aws:ec2:Eip                    vpc-fargate-dev-2                create
 +      │  └─ aws:ec2:NatGateway             vpc-fargate-dev-2                create
 +      ├─ awsx:x:ec2:Subnet                 vpc-fargate-dev-private-0        create
 +      │  ├─ aws:ec2:RouteTable             vpc-fargate-dev-private-0        create
 +      │  ├─ aws:ec2:Subnet                 vpc-fargate-dev-private-0        create
 +      │  ├─ aws:ec2:RouteTableAssociation  vpc-fargate-dev-private-0        create
 +      │  └─ aws:ec2:Route                  vpc-fargate-dev-private-0-nat-0  create
 +      ├─ awsx:x:ec2:InternetGateway        vpc-fargate-dev                  create
 +      │  └─ aws:ec2:InternetGateway        vpc-fargate-dev                  create
 +      ├─ awsx:x:ec2:NatGateway             vpc-fargate-dev-1                create
 +      │  ├─ aws:ec2:Eip                    vpc-fargate-dev-1                create
 +      │  └─ aws:ec2:NatGateway             vpc-fargate-dev-1                create
 +      └─ aws:ec2:Vpc                       vpc-fargate-dev                  create

Resources:
    + 44 to create

Do you want to perform this update?  [Use arrows to move, enter to select, type to filter]
> yes
  no
  details
```

You need to select `yes` to continue.  The url will look similar to the url below and you will need to replace the `shaht` with your own org, `team-qa`:
   https://app.pulumi.com/`shaht`/crosswalk-vpc/vpc-fargate-dev/

8. The stack outputs will be used as [StackReference](https://www.pulumi.com/docs/intro/concepts/organizing-stacks-projects/#inter-stack-dependencies) for ECS fargate (resides in ecs-fargate-python folder)

   ```$ pulumi stack output```

   ```
   Current stack outputs (8):
      OUTPUT                              VALUE
      pulumi_vpc_aws_tags                 {"Name":"vpc-fargate-dev","availability_zones_used":"3","cidr_block":"10.0.0.0/24","cost_center":"1234","crosswalk":"yes","demo":"true","number_of_nat_gateways":"3","pulumi:Configs":"Pulumi.vpc-fargate-dev.yaml","pulumi:Project":"crosswalk-vpc","pulumi:Stack":"vpc-fargate-dev"}
      pulumi_vpc_az_zones                 3
      pulumi_vpc_cidr                     10.0.0.0/24
      pulumi_vpc_id                       vpc-0e1a5b4a8277fb720
      pulumi_vpc_name                     vpc-fargate-dev
      pulumi_vpc_private_subnet_ids       ["subnet-0d7d33f32765376aa","subnet-0697aa77c78831c8a","subnet-0e11a5c7b3bfae990"]
      pulumi_vpc_public_subnet_ids        ["subnet-0f09644bed84984e5","subnet-08f11730467a5a376","subnet-0eff65aac894f1115"]
      pulumic_vpc_number_of_nat_gateways  3
      ```

9. The value to use in a [`StackReference`](https://www.pulumi.com/docs/intro/concepts/organizing-stacks-projects/#inter-stack-dependencies) can be retrieved from the last line.
   ```
      $ pulumi stack
   ```

   ```
   ...
   ...
   More information at: https://app.pulumi.com/shaht/crosswalk-vpc/vpc-fargate-dev
   ```
   Here is what we need from above to launch things in here.
   ```
      shaht/crosswalk-vpc/vpc-fargate-dev
   ```
   Note, yours will be something along the lines of:
   ```
      teamqa/crosswalk-vpc/vpc-fargate-dev


10. Cleanup.  Destroy the vpc only if all there are no other resources running in it such as ecs fargate.
   ```
   $ pulumi destroy -y
   $ pulumi stack rm vpc-fargate
   ```
