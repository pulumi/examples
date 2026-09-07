[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/aws-ts-vpc-with-ecs-fargate-py/vpc-awsx-ts#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/aws-ts-vpc-with-ecs-fargate-py/vpc-awsx-ts#gh-dark-mode-only)

# NGINX on AWS ECS Fargate using Python with a VPC built in TypeScript

This is [Pulumi](https://www.pulumi.com/) code for deploying your own [ECS Fargate cluster with tags](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html) written in Python on top of a VPC built in TypeScript. It demonstrates that you can code in whatever language you want and reuse infrastructure across Go, Python, TypeScript, and .NET.

The [VPC](https://www.pulumi.com/docs/iac/guides/clouds/aws/vpc/) is built using the Pulumi [AWSx](https://www.pulumi.com/docs/iac/guides/clouds/aws/) package in TypeScript, and the ECS cluster is built in Python. The two are connected using a [StackReference](https://www.pulumi.com/docs/intro/concepts/stack/#stackreferences): the VPC [outputs](https://www.pulumi.com/docs/reference/cli/pulumi_stack_output/) are read as inputs in the ECS Fargate project. State is stored using the [Pulumi Cloud backend](https://www.pulumi.com/docs/intro/concepts/state/#pulumi-cloud-backend).

This directory contains two standalone Pulumi projects, each with its own README. Deploy them in order:

- [vpc-awsx-ts/](./vpc-awsx-ts) — deploys an AWS VPC using the AWSx package in TypeScript.
- [ecs-fargate-python/](./ecs-fargate-python) — deploys a load-balanced NGINX web server on ECS Fargate in Python, referencing the VPC from `vpc-awsx-ts`.

The ECS Fargate example is identical to the original at https://github.com/pulumi/examples/tree/master/aws-py-fargate.
