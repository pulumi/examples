# AWS ECS with container instances and delete orchestration

This example demonstrates three use-cases:

- **AWS ECS using Container Instances (Python):** A Python Pulumi program that stands up a custom AWS ECS cluster that uses instances instead of Fargate for the infrastructure.
- **Automation API orchestration:** Destroying this stack without any sort of orchestration will fail due to this issue in the underlying provider: https://github.com/hashicorp/terraform-provider-aws/issues/4852. So, Automation API to the rescue. By orchestrating sizing of the autoscaling group to 0 before the destroy, the destroy is able to complete as expected.
- **Automation API cross-language support:** Although the automation logic is written in TypeScript, the ECS cluster stack is written in Python.

This directory contains two Pulumi projects:

- [py-ecs-instance/](./py-ecs-instance) — a Python Pulumi program that deploys an ECS cluster using "container instances" instead of Fargate, along with an nginx "hello world" test container and related load balancer and networking. You can change into this directory and run `pulumi up` to deploy the stack just as you would with any Pulumi project.
- [automation/](./automation) — the Automation API code (`index.ts`) that handles deploying and, more importantly, orchestrating the deletion of the stack to avoid a dependency constraint.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)
4. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
5. The AWS CLI, with appropriate credentials

## Running the example

The recommended workflow is to run the Automation API program, which orchestrates both the deployment and the deletion of the ECS cluster stack. Change into the `automation` directory and use `yarn` to run the Automation API code:

```bash
cd automation
yarn install
yarn start
```

```
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

## Cleaning up

To destroy the stack, run the Automation API program with an additional `destroy` argument:

```bash
yarn start destroy
```

```
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
