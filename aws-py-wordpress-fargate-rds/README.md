[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-wordpress-fargate-rds/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-wordpress-fargate-rds/README.md#gh-dark-mode-only)

# WordPress Site in AWS Fargate with RDS DB Backend

This example serves a WordPress site in AWS ECS Fargate using an RDS MySQL Backend.

It leverages the following Pulumi concepts/constructs:

- [Component Resources](https://www.pulumi.com/docs/intro/concepts/programming-model/#components): Allows one to create custom resources that encapsulate one's best practices. In this example, component resource is used to define a "VPC" custom resource, a "Backend" custom resource that sets up the RDS DB, and a "Frontend" resource that sets up the ECS cluster and load balancer and tasks.
- [Other Providers](https://www.pulumi.com/registry/): Beyond the providers for the various clouds and Kubernetes, etc, Pulumi allows one to create and manage non-cloud resources. In this case, the program uses the Random provider to create a random password if necessary.

This sample uses the following AWS products (and related Pulumi providers):

- [Amazon VPC](https://aws.amazon.com/vpc): Used to set up a new virtual network in which the system is deployed.
- [Amazon RDS](https://aws.amazon.com/rds): A managed DB service used to provide the MySQL backend for WordPress.
- [Amazon ECS Fargate](https://aws.amazon.com/fargate): A container service used to run the WordPress frontend.

## Getting Started

There are no required configuration parameters for this project since the code will use defaults or generate values as needed - see the beginning of `__main__.py` to see the defaults.
However, you can override these defaults by using `pulumi config` to set the following values (e.g. `pulumi config set service_name my-wp-demo`).

- `service_name` - This is used as a prefix for resources created by the Pulumi program.
- `db_name` - The name of the MySQL DB created in RDS.
- `db_user` - The user created with access to the MySQL DB.
- `db_password` - The password for the DB user. Be sure to use `--secret` if creating this config value (e.g. `pulumi config set db_password --secret`).

## Deploying and running the program

Note: some values in this example will be different from run to run.

1. Create a new stack:

   ```bash
   $ pulumi stack init lamp-test
   ```

1. Set the AWS region:

   ```bash
   $ pulumi config set aws:region us-west-2
   ```

1. Run `pulumi up` to preview and deploy changes. After the preview is shown you will be
   prompted if you want to continue or not. Note: If you set the `db_password` in the configuration as described above, you will not see the `RandomPassword` resource below.

   ```bash
   $ pulumi up
    +   pulumi:pulumi:Stack                  lamp-rds-wordpress-testing        create
    +   ├─ custom:resource:VPC               wp-example-net                    create
    +   │  ├─ aws:ec2:Vpc                    wp-example-net-vpc                create
    +   pulumi:pulumi:Stack                  lamp-rds-wordpress-testing        create.
    +   pulumi:pulumi:Stack                  lamp-rds-wordpress-testing        create
    +   │  ├─ aws:ec2:Subnet                 wp-example-net-subnet-us-west-2a  create
    +   │  ├─ aws:ec2:Subnet                 wp-example-net-subnet-us-west-2b  create
    +   │  ├─ aws:ec2:SecurityGroup          wp-example-net-rds-sg             create
    +   │  ├─ aws:ec2:SecurityGroup          wp-example-net-fe-sg              create
    +   │  ├─ aws:ec2:RouteTableAssociation  vpc-route-table-assoc-us-west-2a  create
    +   │  └─ aws:ec2:RouteTableAssociation  vpc-route-table-assoc-us-west-2b  create
    +   ├─ random:index:RandomPassword       db_password                       create
    +   ├─ custom:resource:Backend           wp-example-be                     create
    +   │  ├─ aws:rds:SubnetGroup            wp-example-be-sng                 create
    +   │  └─ aws:rds:Instance               wp-example-be-rds                 create
    +   └─ custom:resource:Frontend          wp-example-fe                     create
    +      ├─ aws:ecs:Cluster                wp-example-fe-ecs                 create
    +      ├─ aws:iam:Role                   wp-example-fe-task-role           create
    +      ├─ aws:lb:TargetGroup             wp-example-fe-app-tg              create
    +      ├─ aws:iam:RolePolicyAttachment   wp-example-fe-task-policy         create
    +      ├─ aws:lb:LoadBalancer            wp-example-fe-alb                 create
    +      ├─ aws:lb:Listener                wp-example-fe-listener            create
    +      └─ aws:ecs:Service                wp-example-fe-app-svc             create

   ```

1. The program outputs the following values:

- `DB Endpoint`: This is the RDS DB endpoint. By default, the DB is deployed to disallow public access. This can be overriden in the resource declaration for the backend.
- `DB Password`: This is managed as a secret. To see the value, you can use `pulumi stack output --show-secrets`
- `DB User Name`: The user name for access the DB.
- `ECS Cluster Name`: The name of the ECS cluster created by the stack.
- `Web Service URL`: This is a link to the load balancer fronting the WordPress container. Note: It may take a few minutes for AWS to complete deploying the service and so you may see a 503 error initially.

1. To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.

## Troubleshooting

### 503 Error for the Web Service

AWS can take a few minutes to complete deploying the WordPress container and connect the load balancer to the service. So you may see a 503 error for a few minutes right after launching the stack. You can see the status of the service by looking at the cluster in AWS.

## Deployment Speed

Since the stack creates an RDS instance, ECS cluster, load balancer, ECS service, as well as other elements, the stack can take about 4-5 minutes to launch and become ready.
