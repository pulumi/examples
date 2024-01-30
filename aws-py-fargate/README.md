[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-fargate/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-fargate/README.md#gh-dark-mode-only)

# NGINX on AWS ECS Fargate using Python

This example shows authoring Infrastructure as Code in Python. It
provisions a full [Amazon Elastic Container Service (ECS) "Fargate"](https://aws.amazon.com/ecs) cluster and
related infrastructure, running a load-balanced NGINX web server accessible over the Internet on port 80.
This example is inspired by [Docker's Getting Started Tutorial](https://docs.docker.com/get-started/).

## Prerequisites

* [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Configure Pulumi to Use AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is configured, no further changes are required)

## Running the Example

Clone [the examples repo](https://github.com/pulumi/examples/tree/master/aws-py-fargate) and `cd` into it.

Next, to deploy the application and its infrastructure, follow these steps:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init dev
    ```

1. Set your desired AWS region:

    ```bash
    $ pulumi config set aws:region us-east-1 # any valid AWS region will work
    ```

1. Deploy everything with a single `pulumi up` command. This will show you a preview of changes first, which
   includes all of the required AWS resources (clusters, services, and the like). Don't worry if it's more than
   you expected -- this is one of the benefits of Pulumi, it configures everything so that so you don't need to!

    ```bash
    $ pulumi up
    ```

    After being prompted and selecting "yes", your deployment will begin. It'll complete in a few minutes:

    ```bash
    Updating (dev):
         Type                             Name                Status
     +   pulumi:pulumi:Stack              aws-py-fargate-dev  created
     +   ├─ aws:ecs:Cluster               cluster             created
     +   ├─ aws:ec2:SecurityGroup         web-secgrp          created
     +   ├─ aws:iam:Role                  task-exec-role      created
     +   ├─ aws:lb:TargetGroup            app-tg              created
     +   ├─ aws:ecs:TaskDefinition        app-task            created
     +   ├─ aws:iam:RolePolicyAttachment  task-exec-policy    created
     +   ├─ aws:lb:LoadBalancer           app-lb              created
     +   ├─ aws:lb:Listener               web                 created
     +   └─ aws:ecs:Service               app-svc             created

    Outputs:
        url: "app-lb-ad43707-1433933240.us-west-2.elb.amazonaws.com"

    Resources:
        + 10 created

    Duration: 2m56s

    Permalink: https://app.pulumi.com/acmecorp/aws-python-fargate/dev/updates/1
    ```

   Notice that the automatically assigned load-balancer URL is printed as a stack output.

1. At this point, your app is running -- let's curl it. The CLI makes it easy to grab the URL:

    ```bash
    $ curl http://$(pulumi stack output url)
    <!DOCTYPE html>
    <html>
    <head>
    <title>Welcome to nginx!</title>
    <style>
        body {
            width: 35em;
            margin: 0 auto;
            font-family: Tahoma, Verdana, Arial, sans-serif;
        }
    </style>
    </head>
    <body>
    <h1>Welcome to nginx!</h1>
    <p>If you see this page, the nginx web server is successfully installed and
    working. Further configuration is required.</p>

    <p>For online documentation and support please refer to
    <a href="http://nginx.org/">nginx.org</a>.<br/>
    Commercial support is available at
    <a href="http://nginx.com/">nginx.com</a>.</p>

    <p><em>Thank you for using nginx.</em></p>
    </body>
    </html>
    ```

**Please Note**: It may take a few minutes for the app to start up. Until that point, you may receive a 503 error response code.

1. Try making some changes, and rerunning `pulumi up`. For example, let's scale up to 3 instances:

    Running `pulumi up` will show you the delta and then, after confirming, will deploy just those changes:

    ```bash
    $ pulumi up
    ```

    Notice that `pulumi up` redeploys just the parts of the application/infrastructure that you've edited.

    ```bash
        Updating (dev):

         Type                 Name                Status      Info
         pulumi:pulumi:Stack  aws-py-fargate-dev
     ~   └─ aws:ecs:Service   app-svc             updated     [diff: ~desiredCount]

    Outputs:
        url: "app-lb-ad43707-1433933240.us-west-2.elb.amazonaws.com"

    Resources:
        ~ 1 updated
        9 unchanged

    Duration: 14s

    Permalink: https://app.pulumi.com/acmecorp/aws-python-fargate/dev/updates/2
    ```

1. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
