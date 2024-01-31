[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-fargate/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-fargate/README.md#gh-dark-mode-only)

# Dockerized ASP.NET App on AWS ECS Fargate

This example defines a [basic ASP.NET application](./App) and
[all of the infrastructure required to run it in AWS](./Infra) in C#.

This infrastructure includes everything needed to:

* Build and publish the ASP.NET application as a Docker container image
* Store images in a private [Amazon Elastic Container Registry (ECR)](https://aws.amazon.com/ecr/) repository
* Scale out 3 load-balanced replicas using [Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) "Fargate"
* Accept Internet traffic on port 80 using [Amazon Elastic Application Load Balancer (ELB)](https://aws.amazon.com/elasticloadbalancing/)

This example is inspired by [Docker's](https://docs.docker.com/get-started/) and
[ASP.NET's](https://docs.microsoft.com/en-us/aspnet/core/getting-started/?view=aspnetcore-3.1) Getting Started
tutorials. The result is a simple development experience and yet an end result that uses modern, production-ready AWS
infrastructure. [`./Infra/Program.cs`](./Infra/Program.cs) defines the project's infrastructure.

## Prerequisites

* [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Configure Pulumi to Use AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is configured, no further changes are required)
* [Install .NET Core 3](https://dotnet.microsoft.com/download)
* [Install Docker](https://docs.docker.com/install/)

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

3. Deploy everything with a single `pulumi up` command. This will show you a preview of changes first, which
   includes all of the required AWS resources (clusters, services, and the like). Don't worry if it's more than
   you expected -- this is one of the benefits of Pulumi, it configures everything so that so you don't need to!

    ```bash
    $ pulumi up
    ```

    After being prompted and selecting "yes", your deployment will begin. It'll complete in a few minutes:

    ```
    Updating (dev):
         Type                                        Name                Status
     +   pulumi:pulumi:Stack                         aws-cs-fargate-dev  created
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
        url: "http://web-lb-23139b7-1806442625.us-east-1.elb.amazonaws.com"

    Resources:
        + 11 created

    Duration: 3m41s

    Permalink: https://app.pulumi.com/acmecorp/aws-cs-fargate/dev/updates/1
    ```

   Notice that the automatically assigned load-balancer URL is printed as a stack output.

4. At this point, your app is running -- let's curl it. The CLI makes it easy to grab the URL:

    ```bash
    $ curl $(pulumi stack output url)
    Hello World!
    ```

5. Try making some changes and rerunning `pulumi up`.

   If you just change the application code, and deploy the results, for example, only the Docker image
   will be updated and rolled out. Try changing `"Hello World!"` inside of `App/Startup.cs` to `"Hello Pulumi!"`:

   ```bash
   $ pulumi up
   Updating (dev):
         Type                       Name                Plan        Info
         pulumi:pulumi:Stack        aws-cs-fargate-dev
     +-  ├─ aws:ecs:TaskDefinition  app-task            replaced    [diff: ~containerDefinitions]
     ~   ├─ aws:ecs:Service         app-svc             updated     [diff: ~taskDefinition]
         └─ docker:image:Image      app-img

    Resources:
        ~ 1 updated
        +-1 replaced
        2 changes. 9 unchanged
   ```

   Notice that `pulumi up` redeploys just the parts of the application/infrastructure that you've edited.

   Now the endpoint will run the newly updated application code:

    ```bash
    $ curl $(pulumi stack output Url)
    Hello Pulumi!
    ```

6. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
