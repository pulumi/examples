# Using Pulumi for NGINX on AWS ECS Fargate using Python with a vpc built in Typescript

### What Is This?

This is [Pulumi](https://www.pulumi.com/) code for deploying your own [ECS Fargate cluster with tags](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html) written in python on top of vpc built in typescript.

### Why would you do this?  
Code in whatever language you want, you can use things across go, python, typescript, and dotnet. Reuse whatever you can.

### How is the vpc built?

The [vpc](https://www.pulumi.com/docs/guides/crosswalk/aws/vpc/) is built using pulumi [crosswalk](https://www.pulumi.com/docs/guides/crosswalk/aws/) in `typescript`.

### How is the ecs cluster built?
The ecs cluster is built in `python`.

### How do we connect infrastructure written in typescript with python?
We do this via [StackReference](https://www.pulumi.com/docs/intro/concepts/stack/#stackreferences).
The vpc [outputs](https://www.pulumi.com/docs/reference/cli/pulumi_stack_output/) will be read as inputs in the ecs fargate.

### Which Backend are we using?

We are going to use the [Pulumi Cloud backend](https://www.pulumi.com/docs/intro/concepts/state/#pulumi-cloud-backend) for state storage.

## Running the Example

Clone [the examples repo](https://github.com/pulumi/examples/tree/master/aws-ts-vpc-with-ecs-fargate-py) and `cd` into it.

1. `cd vpc-crosswalk-ts` directory for usage information.
2. `cd ecs-fargate-python` directory for usage information.

The ecs fargate example is identical to original one https://github.com/pulumi/examples/tree/master/aws-py-fargate
