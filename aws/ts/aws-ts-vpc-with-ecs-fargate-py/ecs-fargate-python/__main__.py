"""An AWS fargate with crosswalk vpc"""

import pulumi
from pulumi import export, ResourceOptions, Config, StackReference, get_stack, get_project
import json
import pulumi_aws as aws

# https://www.pulumi.com/docs/intro/concepts/organizing-stacks-projects/#inter-stack-dependencies

# read local config settings - network
config = Config()

# reading in vpc StackReference Path from local config
mystackpath = config.require("mystackpath")

# setting the StackReference
mycrosswalkvpc = StackReference(mystackpath)

# Get all network values from previously created vpc #
pulumi_vpc_name = mycrosswalkvpc.require_output("pulumi_vpc_name")
pulumi_vpc_cidr = mycrosswalkvpc.require_output("pulumi_vpc_cidr")
pulumi_vpc_id = mycrosswalkvpc.require_output("pulumi_vpc_id")
pulumi_private_subnets = mycrosswalkvpc.require_output("pulumi_vpc_private_subnet_ids")
pulumi_public_subnets = mycrosswalkvpc.require_output("pulumi_vpc_public_subnet_ids")
pulumi_az_amount = mycrosswalkvpc.require_output("pulumi_vpc_az_zones")
env_stack = get_stack()
env_project = get_project()

# common tags
my_tags = {"application": "fargate", "crosswalk-vpc": "yes", "demo": "yes", "costcenter": "1234", "env": "dev",
           "vpc_name": pulumi_vpc_name, "vpc_cidr": pulumi_vpc_cidr, "pulumi:project": env_project, "pulumi:stack": env_stack}

# Step 1.1: Create the Task Execution IAM Role https://docs.aws.amazon.com/AmazonECS/latest/userguide/ecs-cli-tutorial-fargate.html
# IAM Role: https://www.pulumi.com/registry/packages/aws/api-docs/iam/role/
task_execution_role = aws.iam.Role(
    "pulumi-fargate-task-execution-role",
    assume_role_policy=json.dumps(
        {
            "Version": "2012-10-17",
            "Statement":
            [
                {
                    "Sid": "",
                    "Effect": "Allow",
                    "Principal": {"Service": "ecs-tasks.amazonaws.com"},
                    "Action": "sts:AssumeRole"
                }
            ],
        }
    ),
)

# Step 1.2 Attach the task execution role policy: https://docs.aws.amazon.com/AmazonECS/latest/userguide/ecs-cli-tutorial-fargate.html
# https://www.pulumi.com/registry/packages/aws/api-docs/iam/rolepolicyattachment/
task_execution_role_policy_attach = aws.iam.RolePolicyAttachment(
    "pulumi-fargate-task-excution-policy-attach",
    role=task_execution_role.name,
    policy_arn="arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
)

# Step 3: Create a Cluster and Configure the Security Group https://docs.aws.amazon.com/AmazonECS/latest/userguide/ecs-cli-tutorial-fargate.html
#  https://www.pulumi.com/registry/packages/aws/api-docs/ec2/securitygroup/

# tags for security group
sec_tags = dict(my_tags)
sec_tags.update({"Name": "pulumi-fargate-security-group"})

sgroup = aws.ec2.SecurityGroup(
    'pulumi-fargate-sg',
    description='Enable HTTP access',
    vpc_id=pulumi_vpc_id,
    ingress=[
        {'protocol': 'tcp', 'from_port': 80,
            'to_port': 80, 'cidr_blocks': ['0.0.0.0/0']}
    ],
    egress=[
        {'protocol': '-1', 'from_port': 0,
            'to_port': 0, 'cidr_blocks': ['0.0.0.0/0']},
    ],
    tags=sec_tags,
)

# tags for ecs cluster
cluster_tags = dict(my_tags)
cluster_tags.update({"Name": "pulumi-fargate-ecs-cluster"})

# Create an ECS cluster to run a container-based service.
# https://www.pulumi.com/registry/packages/aws/api-docs/ecs/cluster/
cluster = aws.ecs.Cluster('pulumi-app-cluster', tags=cluster_tags)


# 3. Create a load balancer to listen for requests and route them to the container.
# AWS CLI install   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/tutorial-application-load-balancer-cli.html
# https://www.pulumi.com/registry/packages/aws/api-docs/alb/loadbalancer/

#  tags for Application Load Balancer (ALB)
alb_tags = dict(my_tags)
alb_tags.update({"Name": "pulumi-fargate-alb"})

# Created application load balancer in public subnets  https://www.pulumi.com/registry/packages/aws/api-docs/alb/loadbalancer/
alb = aws.lb.LoadBalancer("pulumi-fargate-alb", subnets=pulumi_public_subnets,
                          security_groups=[sgroup.id], tags=alb_tags)

# Create target group  https://www.pulumi.com/registry/packages/aws/api-docs/alb/targetgroup/
alb_target_group = aws.lb.TargetGroup(
    "pulumi-fargate-alb-tg",
    port=80,
    protocol="HTTP",
    target_type="ip",
    vpc_id=pulumi_vpc_id
)

# Create Listener  https://www.pulumi.com/registry/packages/aws/api-docs/alb/listener/
front_end_listener = aws.lb.Listener(
    "pulumi-fargate-listener",
    load_balancer_arn=alb.arn,
    port=80,
    protocol="HTTP",
    default_actions=[{
        "type": "forward",
        "target_group_arn": alb_target_group.arn,
    }]
)

#  tags for task definition
task_definition_tags = dict(my_tags)
task_definition_tags.update({"Name": "pulumi-fargate-task-definition"})

# Task Definition https://www.pulumi.com/registry/packages/aws/api-docs/ecs/taskdefinition/
task_definition = aws.ecs.TaskDefinition(
    "pulumi-fargate-task-definition",
    family='fargate-task-definition',
    cpu='256',
    memory='512',
    network_mode='awsvpc',
    requires_compatibilities=['FARGATE'],
    execution_role_arn=task_execution_role.arn,
    tags=task_definition_tags,
    container_definitions=json.dumps([{
        'name': 'pulumi-myfargate-app',
                'image': 'nginx',
                'portMappings': [{
                    'containerPort': 80,
                    'hostPort': 80,
                    'protocol': 'tcp'
                }]
    }])
)

# ecs service tags
service_tags = dict(my_tags)
service_tags.update({"Name": "pulumi-fargate-service"})

# ecs service https://www.pulumi.com/registry/packages/aws/api-docs/ecs/service/
service = aws.ecs.Service(
    'pulumi-fargate-service',
    cluster=cluster.arn,
    desired_count=pulumi_az_amount,
    launch_type='FARGATE',
    task_definition=task_definition.arn,
    network_configuration={
                'assign_public_ip': 'true',
                'subnets': pulumi_public_subnets,
                'security_groups': [sgroup.id]
    },
    load_balancers=[{
        'target_group_arn': alb_target_group.arn,
        'container_name': 'pulumi-myfargate-app',
        'container_port': 80
    }],
    opts=ResourceOptions(depends_on=[front_end_listener]),
    tags=service_tags,
)

export('Load Balancer URL', alb.dns_name)
export("ECS Cluster Tags", cluster_tags)
