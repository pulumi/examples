[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-fargate/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-fargate/README.md#gh-dark-mode-only)

# NGINX on AWS ECS Fargate using Go IaC

This example shows authoring Infrastructure as Code in the [Go programming language](https://golang.org). It
provisions a full [Amazon Elastic Container Service (ECS) "Fargate"](https://aws.amazon.com/ecs) cluster and
related infrastructure, building a docker image, pushing it to ECR, and using it to run a web server accessible over the Internet on port 80.
This example is inspired by [Docker's Getting Started Tutorial](https://docs.docker.com/get-started/).

## Prerequisites

* [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Configure Pulumi to Use AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is configured, no further changes are required)
* [Install Go](https://golang.org/doc/install)

## Running the Example

Clone this repo and `cd` into it.

Next, to deploy the application and its infrastructure, follow these steps:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init dev
    ```

2. Set your desired AWS region:

    ```bash
    $ pulumi config set aws:region us-east-1 # any valid AWS region will work
    ```

5. Deploy everything with a single `pulumi up` command. This will show you a preview of changes first, which
   includes all of the required AWS resources (clusters, services, and the like). Don't worry if it's more than
   you expected -- this is one of the benefits of Pulumi, it configures everything so that so you don't need to!

    ```bash
    $ pulumi up
    ```

    After being prompted and selecting "yes", your deployment will begin. It'll complete in a few minutes:

    ```
    Updating (dev):
         Type                                        Name                Status
     +   pulumi:pulumi:Stack                         aws-go-fargate-dev  created
     +   ├─ aws:ec2:SecurityGroup                    web-sg              created
     +   ├─ aws:ecs:Cluster                          app-cluster         created
     +   ├─ aws:iam:Role                             task-exec-role      created
     +   ├─ aws:elasticloadbalancingv2:TargetGroup   web-tg              created
     +   ├─ aws:ecr:Repository                       app-repo            created
     +   ├─ docker:image:Image                       app-img             created
     +   ├─ aws:iam:RolePolicyAttachment             task-exec-policy    created
     +   ├─ aws:ecs:TaskDefinition                   app-task            created
     +   ├─ aws:elasticloadbalancingv2:LoadBalancer  web-lb              created
     +   └─ aws:ecs:Service                          app-svc             created

    Outputs:
        url: "web-lb-651d804-400248986.us-west-2.elb.amazonaws.com"

    Resources:
        + 11 created

    Duration: 3m41s

    Permalink: https://app.pulumi.com/acmecorp/aws-go-fargate/dev/updates/1
    ```

   Notice that the automatically assigned load-balancer URL is printed as a stack output.

6. At this point, your app is running -- let's curl it. The CLI makes it easy to grab the URL:

    ```bash
    $ curl http://$(pulumi stack output url)
    42
    $ curl http://$(pulumi stack output url)
    19
    $ curl http://$(pulumi stack output url)
    88
    ```

7. Try making some changes, rebuilding, and rerunning `pulumi up`. For example, let's scale up to 5 instances:

    ```diff
    -                       DesiredCount:   pulumi.Int(3),
    +                       DesiredCount:   pulumi.Int(5),
    ```

    Running `pulumi up` will show you the delta and then, after confirming, will deploy just those changes:

    ```bash
    $ pulumi up
    ```

    Notice that `pulumi up` redeploys just the parts of the application/infrastructure that you've edited.

    ```
    Updating (dev):

         Type                 Name                Status      Info
         pulumi:pulumi:Stack  aws-go-fargate-dev
     ~   └─ aws:ecs:Service   app-svc             updated     [diff: ~desiredCount]

    Outputs:
        url: "web-lb-651d804-400248986.us-west-2.elb.amazonaws.com"

    Resources:
        ~ 1 updated
        9 unchanged

    Duration: 5s

    Permalink: https://app.pulumi.com/acmecorp/aws-go-fargate/dev/updates/2
    ```

8. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
