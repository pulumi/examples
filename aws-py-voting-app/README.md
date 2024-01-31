[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-voting-app/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-voting-app/README.md#gh-dark-mode-only)

# Voting app Using Redis and Flask

A simple voting app that uses Redis for a data store and a Python Flask app for the frontend. The example has been ported from https://github.com/Azure-Samples/azure-voting-app-redis.

The example shows how easy it is to deploy containers into production and to connect them to one another. Since the example defines a custom container, Pulumi does the following:
- Builds the Docker image
- Provisions AWS Container Registry (ECR) instance
- Pushes the image to the ECR instance
- Creates a new ECS task definition, pointing to the ECR image definition

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)
1. [Install Docker](https://docs.docker.com/engine/installation/)

## Deploying and running the program

1. Create a new stack:

    ```bash
    $ pulumi stack init aws-py-voting-app
    ```

1. Set the AWS region and Redis password:

    ```bash
    $ pulumi config set aws:region us-west-2
    $ pulumi config set redis-password <PASSWORD> --secret
    ```

1. Run `pulumi up -y` to deploy changes:
    ```bash
    Updating (aws-py-voting-app):
        Type                                  Name                            Status      Info
    +   pulumi:pulumi:Stack                   webserver-py-aws-py-voting-app  created
    +   ├─ docker:image:Image                 flask-dockerimage               created
    +   ├─ aws:ec2:Vpc                        app-vpc                         created
    +   ├─ aws:ecs:Cluster                    app-cluster                     created
    +   ├─ aws:iam:Role                       app-exec-role                   created
    +   ├─ aws:iam:Role                       app-task-role                   created
    +   ├─ aws:ecr:Repository                 app-ecr-repo                    created
    +   ├─ aws:ecr:LifecyclePolicy            app-lifecycle-policy            created
    +   ├─ aws:iam:RolePolicyAttachment       app-exec-policy                 created
    +   ├─ aws:iam:RolePolicyAttachment       app-access-policy               created
    +   ├─ aws:iam:RolePolicyAttachment       app-lambda-policy               created
    +   ├─ aws:ecs:TaskDefinition             redis-task-definition           created
    +   ├─ aws:ec2:InternetGateway            app-gateway                     created
    +   ├─ aws:ec2:SecurityGroup              security-group                  created
    +   ├─ aws:ec2:Subnet                     app-vpc-subnet                  created
    +   ├─ aws:lb:TargetGroup                 redis-targetgroup               created
    +   ├─ aws:lb:TargetGroup                 flask-targetgroup               created
    +   ├─ aws:ec2:RouteTable                 app-routetable                  created
    +   ├─ aws:lb:LoadBalancer                redis-balancer                  created
    +   ├─ aws:lb:LoadBalancer                flask-balancer                  created
    +   ├─ aws:ec2:MainRouteTableAssociation  app_routetable_association      created
    +   ├─ aws:lb:Listener                    flask-listener                  created
    +   ├─ aws:lb:Listener                    redis-listener                  created
    +   ├─ aws:ecs:TaskDefinition             flask-task-definition           created
    +   ├─ aws:ecs:Service                    redis-service                   created
    +   └─ aws:ecs:Service                    flask-service                   created

    Outputs:
        app-url: "flask-balancer-3987b84-b596c9ee2027f152.elb.us-west-2.amazonaws.com"

    Resources:
        + 26 created

    Duration: 3m10s
    ```

1. View the DNS address of the instance via `stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT   VALUE
        app-url  flask-balancer-3987b84-b596c9ee2027f152.elb.us-west-2.amazonaws.com

    ```

1.  Verify that the EC2 instance exists, by connecting to it in a browser window.

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
