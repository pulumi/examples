[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-ecs-anywhere/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-ecs-anywhere/README.md#gh-dark-mode-only)

# ECS Anywhere

This example from our [ECS Anywhere launch blog post](https://pulumi.com/blog/ecs-anywhere-launch/) shows how to deploy an ECS cluster along with a dockerized app to DigitalOcean.

To do this, we use Pulumi infrastructure as code to provision an
[Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) cluster, build our `Dockerfile` and deploy the
resulting image to a private [Elastic Container Registry (ECR)](https://aws.amazon.com/ecr/) repository, and then create
a set of DigitalOcean droplets behind a load balancer to allow for zero downtime updates.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is configured, no further changes are required)
3. [Configure DigitalOcean Credentials](https://www.pulumi.com/docs/intro/cloud-providers/digitalocean/setup/)
4. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

After cloning this repo, `cd` into it and run these commands:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1. Set your desired AWS region:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1. Install dependencies:

    ```bash
    npm install
    ```

1. Deploy everything with a single `pulumi up` command. This will show you a preview of changes first, which
   includes all of the required AWS resources (clusters, services, and the like). Don't worry if it's more than
   you expected -- this is one of the benefits of Pulumi, it configures everything so that so you don't need to!

    ```bash
    pulumi up
    ```

    After being prompted and selecting "yes", your deployment will begin. It'll complete in a few minutes:

    ```
    Updating (dev)

    View Live: https://app.pulumi.com/acmecorp/ecs-anywhere/dev/updates/1

        Type                                Name                              Status      Info
    +   pulumi:pulumi:Stack                 ecs-anywhere-dev                  created
    +   ├─ awsx:ecr:Repository              app                               created     1 warning
    +   │  ├─ aws:ecr:Repository            app                               created
    +   │  └─ aws:ecr:LifecyclePolicy       app                               created
    +   ├─ aws:ecs:Cluster                  cluster                           created
    +   ├─ aws:cloudwatch:LogGroup          logGroup                          created
    +   ├─ digitalocean:index:Tag           lb                                created
    +   ├─ aws:iam:Role                     taskRole                          created
    +   ├─ aws:iam:Role                     taskExecutionRole                 created
    +   ├─ aws:iam:Role                     ssmRole                           created
    +   ├─ digitalocean:index:LoadBalancer  lb                                created
    +   ├─ aws:iam:RolePolicy               taskRolePolicy                    created
    +   ├─ aws:iam:RolePolicyAttachment     rpa-ecsanywhere-ecstaskexecution  created
    +   ├─ aws:ssm:Activation               ecsanywhere-ssmactivation         created
    +   ├─ aws:iam:RolePolicyAttachment     rpa-ssmrole-ec2containerservice   created
    +   ├─ aws:iam:RolePolicyAttachment     rpa-ssmrole-ssminstancecore       created
    +   ├─ digitalocean:index:Droplet       droplet-2                         created
    +   ├─ digitalocean:index:Droplet       droplet-1                         created
    +   ├─ aws:ecs:TaskDefinition           taskdefinition                    created
    +   └─ aws:ecs:Service                  service                           created

    Outputs:
        clusterName: "cluster-de98e7f"
        ip         : "165.227.252.130"

    Resources:
        + 20 created

    Duration: 1m30s
    ```

1. At this point, your app is running! The URL was published so it's easy to interact with:

    ```bash
    curl http://$(pulumi stack output ip)
    ```

    ```
    Hello World from Pulumi
    ```

## Cleaning up

Once you are done, there is an additional step before running the usual `pulumi destroy`. This is because the nodes are registered to AWS Systems Manager and the ECS cluster as part of the node setup and happen outside of the Pulumi stack. Run the following in your command line (you'll need to install [jq](https://stedolan.github.io/jq/) for this to work):

```bash
aws ssm describe-instance-information | jq ".InstanceInformationList | .[] | .InstanceId" | grep "mi-" | xargs -L 1 aws ssm deregister-managed-instance --instance-id
aws ecs list-container-instances --cluster $(pulumi stack output clusterName) | jq ".containerInstanceArns | .[]" | xargs -L 1 aws ecs deregister-container-instance --cluster $(pulumi stack output clusterName) --force --container-instance
pulumi refresh -y
pulumi destroy
pulumi stack rm
```
