[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-dynamicresource/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-dynamicresource/README.md#gh-dark-mode-only)

# Pulumi Python Dynamic Resource demonstration

A simple example demonstrating how to write Dynamic Providers using Pulumi.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying and running the program

1. Create a new stack:

    ```bash
    $ pulumi stack init aws-py-dynamicresource
    ```

1. Set the AWS region and the names and passwords for admin and user:

    ```bash
    $ pulumi config set aws:region us-west-2
    $ pulumi config set sql-admin-name <NAME>
    $ pulumi config set sql-admin-password <PASSWORD> --secret
    $ pulumi config set sql-user-name <NAME>
    $ pulumi config set sql-user-password <PASSWORD> --secret
    ```

1. Run `pulumi up -y` to deploy changes:

    ```bash
    Updating (aws-py-dynamicresource):
        Type                                  Name                                           Status
    +   pulumi:pulumi:Stack                   aws-py-dynamicresource-aws-py-dynamicresource  created
    +   ├─ aws:ec2:Vpc                        app-vpc                                        created
    +   ├─ aws:ec2:InternetGateway            app-gateway                                    created
    +   ├─ aws:ec2:SecurityGroup              security-group                                 created
    +   ├─ aws:ec2:Subnet                     app-vpc-subnet                                 created
    +   ├─ aws:ec2:Subnet                     extra-rds-subnet                               created
    +   ├─ aws:ec2:RouteTable                 app-routetable                                 created
    +   ├─ aws:rds:SubnetGroup                app-database-subnetgroup                       created
    +   ├─ aws:ec2:MainRouteTableAssociation  app_routetable_association                     created
    +   ├─ aws:rds:Instance                   mysql-server                                   created
    +   ├─ pulumi:providers:mysql             mysql-provider                                 created
    +   ├─ mysql:index:Database               mysql-database                                 created
    +   ├─ mysql:index:User                   mysql-standard-user                            created
    +   ├─ mysql:index:Grant                  mysql-access-grant                             created
    +   └─ pulumi-python:dynamic:Resource     mysql_votes_table                              created

    Outputs:
        dynamic-resource-id: "schema-44462d37c8e04c18be08cbf05670a328"

    Resources:
        + 15 created

    Duration: 3m31s
    ```

1. View the ID of the dynamic resource via `stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT               VALUE
        dynamic-resource-id  schema-44462d37c8e04c18be08cbf05670a328
    ```

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
