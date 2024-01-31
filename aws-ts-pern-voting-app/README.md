[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-pern-voting-app/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-pern-voting-app/README.md#gh-dark-mode-only)

# PERN Stack Voting App

A simple voting app that uses React, Express, PostgreSQL, and NodeJS.

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
    $ pulumi stack init aws-ts-pern-voting-app
    ```

1. Set the AWS region and the usernames and passwords for a set of accounts the project uses:

    ```bash
    $ pulumi config set aws:region us-west-2
    $ pulumi config set sqlAdminName <NAME>
    $ pulumi config set sqlsqlAdminPassword <PASSWORD> --secret
    $ pulumi config set sqlUserName <NAME>
    $ pulumi config set sqlUserPassword <PASSWORD> --secret
    ```

1. Restore NPM modules via `npm install` or `yarn install`.

1. Run `pulumi up -y` to deploy changes:

    ```bash
    Updating (aws-ts-pern-voting-app):
        Type                                          Name                                    Status       Info
    +   pulumi:pulumi:Stack                           voting-app-aws-ts-pern-voting-app          created
    +   ├─ awsx:x:ecs:FargateTaskDefinition           server-side-service                     created
    +   ├─ awsx:x:ecs:FargateTaskDefinition           server-side-service                     created
    +   │  ├─ aws:iam:Role                            server-side-service-execution           created
    +   ├─ awsx:x:ecs:FargateTaskDefinition           server-side-service                     created
    +   │  ├─ aws:cloudwatch:LogGroup                 server-side-service                     created
    +   │  ├─ aws:iam:RolePolicyAttachment            server-side-service-task-fd1a00e5       created
    +   ├─ awsx:x:ecs:FargateTaskDefinition           server-side-service                     created
    +   pulumi:pulumi:Stack                           voting-app-aws-ts-pern-voting-app          created
    +   pulumi:pulumi:Stack                           voting-app-aws-ts-pern-voting-app          created
    +   pulumi:pulumi:Stack                           voting-app-aws-ts-pern-voting-app          created
    +   pulumi:pulumi:Stack                           voting-app-aws-ts-pern-voting-app          created
    +   pulumi:pulumi:Stack                           voting-app-aws-ts-pern-voting-app          created
    +   pulumi:pulumi:Stack                           voting-app-aws-ts-pern-voting-app          created
    +   pulumi:pulumi:Stack                           voting-app-aws-ts-pern-voting-app          created
    +   │  ├─ aws:iam:Role                            client-side-service-execution           created
    +   │  ├─ aws:iam:Role                            client-side-service-execution           created
    +   │  ├─ aws:iam:Role                            client-side-service-execution           created
    +   │  ├─ aws:ecr:LifecyclePolicy                 client-side-service                     created
    +   │  ├─ aws:iam:RolePolicyAttachment            client-side-service-task-fd1a00e5       created
    +   │  ├─ aws:iam:RolePolicyAttachment            client-side-service-task-32be53a2       created
    +   │  ├─ aws:iam:RolePolicyAttachment            client-side-service-execution-9a42f520  created
    +   │  └─ aws:ecs:TaskDefinition                  client-side-service                     created
    +   ├─ awsx:lb:NetworkLoadBalancer                client-side-listener                    created
    +   │  ├─ awsx:lb:NetworkTargetGroup              client-side-listener                    created
    +   │  │  └─ aws:lb:TargetGroup                   client-side-listener                    created
    +   │  ├─ awsx:lb:NetworkListener                 client-side-listener                    created
    +   │  │  └─ aws:lb:Listener                      client-side-listener                    created
    +   │  └─ aws:lb:LoadBalancer                     client-side-listener                    created
    +   ├─ awsx:lb:NetworkLoadBalancer                server-side-listener                    created
    +   │  ├─ awsx:lb:NetworkTargetGroup              server-side-listener                    created
    +   │  │  └─ aws:lb:TargetGroup                   server-side-listener                    created
    +   │  ├─ awsx:lb:NetworkListener                 server-side-listener                    created
    +   │  │  └─ aws:lb:Listener                      server-side-listener                    created
    +   │  └─ aws:lb:LoadBalancer                     server-side-listener                    created
    +   ├─ awsx:x:ecs:FargateService                  client-side-service                     created
    +   │  └─ aws:ecs:Service                         client-side-service                     created
    +   ├─ awsx:x:ecs:Cluster                         default-cluster                         created
    +   │  ├─ awsx:x:ec2:SecurityGroup                default-cluster                         created
    +   │  │  ├─ awsx:x:ec2:EgressSecurityGroupRule   default-cluster-egress                  created
    +   │  │  │  └─ aws:ec2:SecurityGroupRule         default-cluster-egress                  created
    +   │  │  ├─ awsx:x:ec2:IngressSecurityGroupRule  default-cluster-ssh                     created
    +   │  │  │  └─ aws:ec2:SecurityGroupRule         default-cluster-ssh                     created
    +   │  │  ├─ awsx:x:ec2:IngressSecurityGroupRule  default-cluster-containers              created
    +   │  │  │  └─ aws:ec2:SecurityGroupRule         default-cluster-containers              created
    +   │  │  └─ aws:ec2:SecurityGroup                default-cluster                         created
    +   │  └─ aws:ecs:Cluster                         default-cluster                         created
    +   ├─ aws:ec2:Vpc                                app-vpc                                 created
    +   ├─ awsx:x:ec2:Vpc                             default-vpc                             created
    +   │  ├─ awsx:x:ec2:Subnet                       default-vpc-public-1                    created
    +   │  └─ awsx:x:ec2:Subnet                       default-vpc-public-0                    created
    +   ├─ aws:ec2:Subnet                             second-rds-subnet                       created
    +   ├─ aws:ec2:Subnet                             first-rds-subnet                        created
    +   ├─ aws:ec2:InternetGateway                    app-gateway                             created
    +   ├─ aws:ec2:SecurityGroup                      rds-security-group                      created
    +   ├─ aws:rds:SubnetGroup                        rds-subnet-group                        created
    +   ├─ aws:ec2:RouteTable                         app-routetable                          created
    +   ├─ aws:ec2:MainRouteTableAssociation          app-routetable-association              created
    +   ├─ aws:rds:Instance                           postgresql-rds-server                   created
    +   ├─ pulumi:providers:postgresql                postgresql-provider                     created
    +   ├─ postgresql:index:Database                  postgresql-database                     created
    +   ├─ postgresql:index:Role                      postgres-standard-role                  created
    +   └─ pulumi-nodejs:dynamic:Resource             postgresql-votes-schema                 created

    Outputs:
        URL: "client-side-listener-086d27d-bb5f264d141c31b7.elb.us-west-2.amazonaws.com"

    Resources:
        + 63 created

    Duration: 4m2s
    ```

1. View the DNS address of the instance via `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT   VALUE
        URL  client-side-listener-086d27d-bb5f264d141c31b7.elb.us-west-2.amazonaws.com
    ```

1.  Verify that the ECS instance exists by connecting to it in a browser window.

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
