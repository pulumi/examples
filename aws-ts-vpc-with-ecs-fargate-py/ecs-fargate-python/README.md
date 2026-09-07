[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-vpc-with-ecs-fargate-py/ecs-fargate-python/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-vpc-with-ecs-fargate-py/ecs-fargate-python/README.md#gh-dark-mode-only)

# NGINX on AWS ECS Fargate using Python with a VPC built in TypeScript

This example demonstrates the ability to deploy resources in Pulumi using one language (TypeScript) and then reference those resources from another Pulumi application using a different language (Python).

- [`vpc-awsx-ts`](../vpc-awsx-ts) deploys an AWS VPC using TypeScript.
- [`ecs-fargate-python`](../ecs-fargate-python) deploys an AWS ECS cluster using Python that references the VPC from `vpc-awsx-ts`.

It provisions a full [Amazon Elastic Container Service (ECS) "Fargate"](https://aws.amazon.com/ecs) cluster and related infrastructure, running a load-balanced NGINX web server accessible over the Internet on port 80. This example is inspired by [Docker's Getting Started Tutorial](https://docs.docker.com/get-started/). The VPC outputs from the `vpc-awsx-ts` folder are used as inputs via [StackReference](https://www.pulumi.com/docs/intro/concepts/organizing-stacks-projects/#inter-stack-dependencies).

> **Mandatory AWS prerequisite: enable the new ECS resource ARN and ID formats.**
> This is necessary so that tags work properly in ECS. See [Tagging your Amazon ECS resources](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-using-tags.html). Per AWS: "You must opt in to the new Amazon Resource Name (ARN) and resource identifier (ID) formats." This has to be done per region. In the AWS Console, go to Elastic Container Service → Account Settings and enable the new formats for Container Instance, Service, and Task.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

First deploy the [vpc-awsx-ts](../vpc-awsx-ts) project so that its stack outputs are available to reference here.

1. Create a new stack:

   ```bash
   pulumi stack init ecs-fargate-dev
   ```

1. Install dependencies:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

1. Set the configuration for the program. The `mystackpath` value is the fully-qualified stack name (`org/project/stack`) of your VPC stack — for example `team-qa/awsx-vpc/vpc-fargate-dev`. This format only applies to the Pulumi Cloud backend (not self-hosted):

   ```bash
   pulumi config set aws:region us-east-2
   pulumi config set mystackpath team-qa/awsx-vpc/vpc-fargate-dev
   ```

1. Deploy the stack:

   ```bash
   pulumi up
   ```

1. View the outputs:

   ```bash
   pulumi stack output
   ```

   ```
   Current stack outputs (2):
   OUTPUT             VALUE
   ECS Cluster Tags   {"Name":"pulumi-fargate-ecs-cluster",...}
   Load Balancer URL  pulumi-fargate-alb-7467631-1452059497.us-east-2.elb.amazonaws.com
   ```

## Cleaning up

Destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm ecs-fargate-dev
```
