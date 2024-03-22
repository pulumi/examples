[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-hello-fargate/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-hello-fargate/README.md#gh-dark-mode-only)

# Dockerized App Using ECS, ECR, and Fargate

This example, inspired by the [Docker Getting Started Tutorial](https://docs.docker.com/get-started/), builds, deploys,
and runs a simple containerized application to a private container registry, and scales out five load balanced replicas,
all in just a handful of lines of Node.js code, and leveraging modern and best-in-class AWS features.

To do this, we use Pulumi infrastructure as code to provision an
[Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) cluster, build our `Dockerfile` and deploy the
resulting image to a private [Elastic Container Registry (ECR)](https://aws.amazon.com/ecr/) repository, and then create
a scaled-out [Fargate](https://aws.amazon.com/fargate/) service behind an
[Elastic Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/) that allows traffic from the Internet
on port 80. Because this example using AWS services directly, you can mix in other resources, like S3 buckets, RDS
databases, and so on.

## Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- [Download and install the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Connect Pulumi with your AWS account](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is configured, no further changes are required)

## Running the Example

After cloning this repo, `cd` into it and run these commands:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init dev
    ```

2. Set your desired AWS region:

    ```bash
    $ pulumi config set aws:region us-east-1 # any valid AWS region will work
    ```

3. Deploy everything with a single `pulumi up` command. This will show you a preview of changes first, which
   includes all of the required AWS resources (clusters, services, and the like). Don't worry if it's more than
   you expected -- this is one of the benefits of Pulumi, it configures everything so that so you don't need to!

    ```bash
    $ pulumi up
    ```

    After being prompted and selecting "yes", your deployment will begin. It'll complete in a few minutes:

    ```
    Updating (dev):

         Type                                                        Name                        Status
     +   pulumi:pulumi:Stack                                         aws-ts-hello-fargate-dev    created
     +   ├─ awsx:x:ecs:Cluster                                       cluster                     created
     +   │  ├─ awsx:x:ec2:SecurityGroup                              cluster                     created
     +   │  │  ├─ awsx:x:ec2:EgressSecurityGroupRule                 cluster-egress              created
     +   │  │  │  └─ aws:ec2:SecurityGroupRule                       cluster-egress              created
     +   │  │  ├─ awsx:x:ec2:IngressSecurityGroupRule                cluster-ssh                 created
     +   │  │  │  └─ aws:ec2:SecurityGroupRule                       cluster-ssh                 created
     +   │  │  ├─ awsx:x:ec2:IngressSecurityGroupRule                cluster-containers          created
     +   │  │  │  └─ aws:ec2:SecurityGroupRule                       cluster-containers          created
     +   │  │  └─ aws:ec2:SecurityGroup                              cluster                     created
     +   │  └─ aws:ecs:Cluster                                       cluster                     created
     +   ├─ awsx:x:elasticloadbalancingv2:ApplicationLoadBalancer    net-lb                      created
     +   │  ├─ awsx:x:elasticloadbalancingv2:ApplicationTargetGroup  web                         created
     +   │  │  └─ aws:elasticloadbalancingv2:TargetGroup             ca84d134                    created
     +   │  ├─ awsx:x:elasticloadbalancingv2:ApplicationListener     web                         created
     +   │  │  ├─ awsx:x:ec2:IngressSecurityGroupRule                web-external-0-ingress      created
     +   │  │  │  └─ aws:ec2:SecurityGroupRule                       web-external-0-ingress      created
     +   │  │  └─ aws:elasticloadbalancingv2:Listener                web                         created
     +   │  └─ aws:elasticloadbalancingv2:LoadBalancer               218ffe37                    created
     +   ├─ awsx:x:ec2:Vpc                                           default-vpc                 created
     +   │  ├─ awsx:x:ec2:Subnet                                     default-vpc-public-0        created
     +   │  ├─ awsx:x:ec2:Subnet                                     default-vpc-public-1        created
     >   │  ├─ aws:ec2:Subnet                                        default-vpc-public-0        read
     >   │  └─ aws:ec2:Subnet                                        default-vpc-public-1        read
     +   ├─ awsx:x:ecs:FargateTaskDefinition                         app-svc                     created
     +   │  ├─ aws:ecr:Repository                                    app-img                     created
     +   │  ├─ aws:cloudwatch:LogGroup                               app-svc                     created
     +   │  ├─ aws:iam:Role                                          app-svc-task                created
     +   │  ├─ aws:iam:Role                                          app-svc-execution           created
     +   │  ├─ aws:ecr:LifecyclePolicy                               app-img                     created
     +   │  ├─ aws:iam:RolePolicyAttachment                          app-svc-task-32be53a2       created
     +   │  ├─ aws:iam:RolePolicyAttachment                          app-svc-task-fd1a00e5       created
     +   │  ├─ aws:iam:RolePolicyAttachment                          app-svc-execution-9a42f520  created
     +   │  └─ aws:ecs:TaskDefinition                                app-svc                     created
     +   ├─ awsx:x:ecs:FargateService                                app-svc                     created
     +   │  └─ aws:ecs:Service                                       app-svc                     created
     >   └─ aws:ec2:Vpc                                              default-vpc                 read

    Outputs:
        url: "218ffe37-e8023b7-1429118690.us-east-1.elb.amazonaws.com"

    Resources:
        + 34 created

    Duration: 3m30s

    Permalink: https://app.pulumi.com/acmecorp/aws-ts-hello-fargate/dev/updates/1
    ```

4. At this point, your app is running! The URL was published so it's easy to interact with:

    ```bash
    $ curl http://$(pulumi stack output url)
    <h3>Hello World!</h3>
    <b>Hostname:</b> ip-172-31-39-18.ec2.internal<br/>
    <b>Visits:</b> <i>cannot connect to Redis, counter disabled</i>
    ```

   For more details on how to enable Redis or advanced options, please see the instructions in the
   [Docker Getting Started guide](https://docs.docker.com/get-started/part6/).

6. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
