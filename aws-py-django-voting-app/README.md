[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-django-voting-app/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-django-voting-app/README.md#gh-dark-mode-only)

# Voting app Using Django and MySQL

A simple voting app that uses MySQL for data storage and a Python Django app for the frontend.

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
    $ pulumi stack init aws-py-django-voting-app
    ```

1. Set the AWS region, the usernames and passwords for a set of accounts the project uses, and a random 50-character string to serve as Django's secret key:

    ```bash
    $ pulumi config set aws:region us-west-2
    $ pulumi config set sql-admin-name <NAME>
    $ pulumi config set sql-admin-password <PASSWORD> --secret
    $ pulumi config set sql-user-name <NAME>
    $ pulumi config set sql-user-password <PASSWORD> --secret
    $ pulumi config set django-admin-name <NAME>
    $ pulumi config set django-admin-password <PASSWORD> --secret
    $ pulumi config set django-secret-key <VALUE> --secret
    ```

1. Run `pulumi up -y` to deploy changes:

    ```bash
    Updating (aws-py-django-voting-app):
        Type                                  Name                              Status      Info
    +   pulumi:pulumi:Stack                   voting-app-aws-py-django-voting-app  created
    +   ├─ docker:image:Image                 django-dockerimage                created     1 warning
    +   ├─ aws:ec2:Vpc                        app-vpc                           created
    +   ├─ aws:ecs:Cluster                    app-cluster                       created
    +   ├─ aws:iam:Role                       app-exec-role                     created
    +   ├─ aws:iam:Role                       app-task-role                     created
    +   ├─ aws:ecr:Repository                 app-ecr-repo                      created
    +   ├─ aws:cloudwatch:LogGroup            django-log-group                  created
    +   ├─ aws:ecr:LifecyclePolicy            app-lifecycle-policy              created
    +   ├─ aws:iam:RolePolicyAttachment       app-exec-policy                   created
    +   ├─ aws:iam:RolePolicyAttachment       app-access-policy                 created
    +   ├─ aws:iam:RolePolicyAttachment       app-lambda-policy                 created
    +   ├─ aws:ec2:InternetGateway            app-gateway                       created
    +   ├─ aws:ec2:SecurityGroup              security-group                    created
    +   ├─ aws:ec2:Subnet                     app-vpc-subnet                    created
    +   ├─ aws:ec2:Subnet                     extra-rds-subnet                  created
    +   ├─ aws:lb:TargetGroup                 django-targetgroup                created
    +   ├─ aws:lb:LoadBalancer                django-balancer                   created
    +   ├─ aws:ec2:RouteTable                 app-routetable                    created
    +   ├─ aws:rds:SubnetGroup                app-database-subnetgroup          created
    +   ├─ aws:ec2:MainRouteTableAssociation  app_routetable_association        created
    +   ├─ aws:rds:Instance                   mysql-server                      created
    +   ├─ aws:lb:Listener                    django-listener                   created
    +   ├─ pulumi:providers:mysql             mysql-provider                    created
    +   ├─ mysql:index:Database               mysql-database                    created
    +   ├─ mysql:index:User                   mysql-standard-user               created
    +   ├─ mysql:index:Grant                  mysql-access-grant                created
    +   ├─ aws:ecs:TaskDefinition             django-site-task-definition       created
    +   ├─ aws:ecs:TaskDefinition             django-database-task-definition   created
    +   ├─ aws:ecs:Service                    django-site-service               created
    +   └─ aws:ecs:Service                    django-database-service           created

    Outputs:
        app-url: "django-balancer-2f4f9fe-c6e6893a1972a811.elb.us-west-2.amazonaws.com"

    Resources:
        + 31 created

    Duration: 4m16s
    ```

1. View the DNS address of the instance via `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT   VALUE
        app-url  django-balancer-2f4f9fe-c6e6893a1972a811.elb.us-west-2.amazonaws.com
    ```

1.  Verify that the ECS instance exists by connecting to it in a browser window.

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
