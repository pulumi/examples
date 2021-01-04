# AWS ECS with Container Instances and Delete Orchestration

This example demonstrates three use-cases:

- AWS ECS using Container Instances (Python): A Python Pulumi program that stands up a custom AWS ECS cluster that uses instances instead of fargate for the infrastructure.
- Automation API Orchestration: Destroying this stack without any sort of orchestration will fail due to this issue in the underlying provider: https://github.com/hashicorp/terraform-provider-aws/issues/4852. So, Automation API to the rescue. By orchestrating sizing of the autoscaling group to 0 before the destroy, the destroy is able to complete as expected.
- Automation API cross-language support: Although the automation logic is written in TypeScript, the ECS cluster stack is written in Python.

## Project Structure

### `/py-ecs-instance`:

This is a Pulumi project/stack python program that deploys the following:

- ECS Cluster using "container instances" instead of Fargate.
- An nginx "hello world" test container and related load balancer and networking.
  One can change to this directory and run `pulumi up` and deploy the stack just as would be done with any Pulumi project ...

But wait, there's more ...

### `/automation`

This directory contains the automation api code (`index.ts`) that handles deploying and, more importantly, orchestrating the deletion of the stack to avoid a dependency constraint.

## How to Use

To run this example you'll need a few pre-reqs:

1. A Pulumi CLI installation ([v2.15.6](https://www.pulumi.com/docs/get-started/install/versions/) or later)
2. Python 3.6+
3. The AWS CLI, with appropriate credentials.

To run our automation program we just `cd` to the `automation` directory and use `yarn` to run the automation api code.

```shell
$ yarn install
$ yarn start
yarn run v1.19.1
$ ./node_modules/ts-node/dist/bin.js index.ts
successfully initialized stack
setting up config
config set
refreshing stack...
Refreshing (dev)
...
refresh complete
updating stack...
Updating (dev)
...

update summary:
{
    "same": 0,
    "update": 16
}
website url: http://load-balancer-xxxxxxxxx.us-east-1.elb.amazonaws.com
```

To destroy the stack, we run the automation program with an additional `destroy` argument:

```shell
$ yarn start destroy
yarn run v1.19.1
$ ./node_modules/ts-node/dist/bin.js index.ts destroy
successfully initialized stack
setting up config
config set
refreshing stack...
Refreshing (dev)
destroying stack ...
Destroying (dev)
...
@ Destroying ...
...
Resources:
    - 16 deleted

The resources in the stack have been deleted, but the history and configuration associated with the stack are still maintained.
If you want to remove the stack completely, run 'pulumi stack rm dev'.

stack destroy complete
```
