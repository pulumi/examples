# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import base64
import json

import pulumi
import pulumi_aws as aws
import pulumi_docker as docker

# Get the password to use for Redis from the pulumi config
config = pulumi.Config()
redis_password = config.require("redis-password")
redis_port = 6379

# The ECS cluster in which our application and databse will run
app_cluster = aws.ecs.Cluster("app-cluster")

# Creating a VPC and a public subnet
app_vpc = aws.ec2.Vpc("app-vpc",
    cidr_block="172.31.0.0/16",
    enable_dns_hostnames=True)

app_vpc_subnet = aws.ec2.Subnet("app-vpc-subnet",
    cidr_block="172.31.32.0/20",
    vpc_id=app_vpc.id)

# Creating a gateway to the web for the VPC
app_gateway = aws.ec2.InternetGateway("app-gateway",
    vpc_id=app_vpc.id)

app_routetable = aws.ec2.RouteTable("app-routetable",
    routes=[
        aws.ec2.RouteTableRouteArgs(
            cidr_block="0.0.0.0/0",
            gateway_id=app_gateway.id,
        )
    ],
    vpc_id=app_vpc.id)

# Associating our gateway with our VPC, to allow our app to communicate with the greater internet
app_routetable_association = aws.ec2.MainRouteTableAssociation("app_routetable_association",
    route_table_id=app_routetable.id,
    vpc_id=app_vpc.id)

# Creating a Security Group that restricts incoming traffic to HTTP
app_security_group = aws.ec2.SecurityGroup("security-group",
	vpc_id=app_vpc.id,
	description="Enables HTTP access",
    ingress=[aws.ec2.SecurityGroupIngressArgs(
		protocol='tcp',
		from_port=0,
		to_port=65535,
		cidr_blocks=['0.0.0.0/0'],
    )],
    egress=[aws.ec2.SecurityGroupEgressArgs(
		protocol='-1',
		from_port=0,
		to_port=0,
		cidr_blocks=['0.0.0.0/0'],
    )])

# Creating an IAM role used by Fargate to execute all our services
app_exec_role = aws.iam.Role("app-exec-role",
    assume_role_policy="""{
        "Version": "2012-10-17",
        "Statement": [
        {
            "Action": "sts:AssumeRole",
            "Principal": {
                "Service": "ecs-tasks.amazonaws.com"
            },
            "Effect": "Allow",
            "Sid": ""
        }]
    }""")

# Attaching execution permissions to the exec role
exec_policy_attachment = aws.iam.RolePolicyAttachment("app-exec-policy", role=app_exec_role.name,
	policy_arn="arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy")

# Creating an IAM role used by Fargate to manage tasks
app_task_role = aws.iam.Role("app-task-role",
    assume_role_policy="""{
        "Version": "2012-10-17",
        "Statement": [
        {
            "Action": "sts:AssumeRole",
            "Principal": {
                "Service": "ecs-tasks.amazonaws.com"
            },
            "Effect": "Allow",
            "Sid": ""
        }]
    }""")

# Attaching execution permissions to the task role
task_policy_attachment = aws.iam.RolePolicyAttachment("app-access-policy", role=app_task_role.name,
	policy_arn=aws.iam.ManagedPolicy.AMAZON_ECS_FULL_ACCESS)

# Creating storage space to upload a docker image of our app to
app_ecr_repo = aws.ecr.Repository("app-ecr-repo",
    image_tag_mutability="MUTABLE")

# Attaching an application life cycle policy to the storage
app_lifecycle_policy = aws.ecr.LifecyclePolicy("app-lifecycle-policy",
    repository=app_ecr_repo.name,
    policy="""{
        "rules": [
            {
                "rulePriority": 10,
                "description": "Remove untagged images",
                "selection": {
                    "tagStatus": "untagged",
                    "countType": "imageCountMoreThan",
                    "countNumber": 1
                },
                "action": {
                    "type": "expire"
                }
            }
        ]
    }""")

# The application's backend and data layer: Redis

# Creating a target group through which the Redis backend receives requests
redis_targetgroup = aws.lb.TargetGroup("redis-targetgroup",
	port=redis_port,
	protocol="TCP",
	target_type="ip",
    stickiness=aws.lb.TargetGroupStickinessArgs(
        enabled=False,
        type="lb_cookie",
    ),
	vpc_id=app_vpc.id)

# Creating a load balancer to spread out incoming requests
redis_balancer = aws.lb.LoadBalancer("redis-balancer",
    load_balancer_type="network",
    internal=False,
    security_groups=[],
	subnets=[app_vpc_subnet.id])

# Forwards internal traffic with the Redis port number to the Redis target group
redis_listener = aws.lb.Listener("redis-listener",
	load_balancer_arn=redis_balancer.arn,
	port=redis_port,
    protocol="TCP",
	default_actions=[aws.lb.ListenerDefaultActionArgs(
		type="forward",
		target_group_arn=redis_targetgroup.arn
	)])

# Creating a task definition for the Redis instance.
redis_task_definition = aws.ecs.TaskDefinition("redis-task-definition",
    family="redis-task-definition-family",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    requires_compatibilities=["FARGATE"],
    execution_role_arn=app_exec_role.arn,
    task_role_arn=app_task_role.arn,
    container_definitions=json.dumps([{
        "name": "redis-container",
        "image": "redis:alpine", # A pre-built docker image with a functioning redis server
        "memory": 512,
        "essential": True,
        "portMappings": [{
            "containerPort": redis_port,
            "hostPort": redis_port,
            "protocol": "tcp"
        }],
        "command": ["redis-server", "--requirepass", redis_password],
	}]))

# Launching our Redis service on Fargate, using our configurations and load balancers
redis_service = aws.ecs.Service("redis-service",
	cluster=app_cluster.arn,
    desired_count=1,
    launch_type="FARGATE",
    task_definition=redis_task_definition.arn,
    wait_for_steady_state=False,
    network_configuration=aws.ecs.ServiceNetworkConfigurationArgs(
		assign_public_ip=True,
		subnets=[app_vpc_subnet.id],
		security_groups=[app_security_group.id]
	),
    load_balancers=[aws.ecs.ServiceLoadBalancerArgs(
		target_group_arn=redis_targetgroup.arn,
		container_name="redis-container",
		container_port=redis_port,
	)],
    opts=pulumi.ResourceOptions(depends_on=[redis_listener]),
)

# Creating a special endpoint for the Redis backend, which we will provide
# to the Flask frontend as an environment variable
redis_endpoint = {"host": redis_balancer.dns_name, "port": redis_port}

# The application's frontend: A Flask service

# Creating a target group through which the Flask frontend receives requests
flask_targetgroup = aws.lb.TargetGroup("flask-targetgroup",
	port=80,
	protocol="TCP",
	target_type="ip",
    stickiness=aws.lb.TargetGroupStickinessArgs(
        enabled=False,
        type="lb_cookie",
    ),
	vpc_id=app_vpc.id)

# Creating a load balancer to spread out incoming requests
flask_balancer = aws.lb.LoadBalancer("flask-balancer",
    load_balancer_type="network",
    internal=False,
    security_groups=[],
    subnets=[app_vpc_subnet.id])

# Forwards all public traffic using port 80 to the Flask target group
flask_listener = aws.lb.Listener("flask-listener",
	load_balancer_arn=flask_balancer.arn,
	port=80,
    protocol="TCP",
	default_actions=[aws.lb.ListenerDefaultActionArgs(
		type="forward",
		target_group_arn=flask_targetgroup.arn
	)])

# Creating a Docker image from "./frontend/Dockerfile", which we will use
# to upload our app
def get_registry_info(rid):
    creds = aws.ecr.get_credentials(registry_id=rid)
    decoded = base64.b64decode(creds.authorization_token).decode()
    parts = decoded.split(':')
    if len(parts) != 2:
        raise Exception("Invalid credentials")
    return docker.ImageRegistry(creds.proxy_endpoint, parts[0], parts[1])

app_registry = app_ecr_repo.registry_id.apply(get_registry_info)

flask_image = docker.Image("flask-dockerimage",
    image_name=app_ecr_repo.repository_url,
    build="./frontend",
    skip_push=False,
    registry=app_registry
)

# Creating a task definition for the Flask instance.
flask_task_definition = aws.ecs.TaskDefinition("flask-task-definition",
    family="frontend-task-definition-family",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    requires_compatibilities=["FARGATE"],
    execution_role_arn=app_exec_role.arn,
    task_role_arn=app_task_role.arn,
    container_definitions=pulumi.Output.json_dumps([{
        "name": "flask-container",
        "image": flask_image.image_name,
        "memory": 512,
        "essential": True,
        "portMappings": [{
            "containerPort": 80,
            "hostPort": 80,
            "protocol": "tcp"
        }],
        "environment": [ # The Redis endpoint we created is given to Flask, allowing it to communicate with the former
            { "name": "REDIS", "value": redis_endpoint["host"] },
            { "name": "REDIS_PORT", "value": redis_endpoint["port"].apply(lambda x: str(x)) },
            { "name": "REDIS_PWD", "value": redis_password },
        ],
    }]))

# Launching our Redis service on Fargate, using our configurations and load balancers
flask_service = aws.ecs.Service("flask-service",
	cluster=app_cluster.arn,
    desired_count=1,
    launch_type="FARGATE",
    task_definition=flask_task_definition.arn,
    wait_for_steady_state=False,
    network_configuration=aws.ecs.ServiceNetworkConfigurationArgs(
		assign_public_ip=True,
		subnets=[app_vpc_subnet.id],
		security_groups=[app_security_group.id]
	),
    load_balancers=[aws.ecs.ServiceLoadBalancerArgs(
		target_group_arn=flask_targetgroup.arn,
		container_name="flask-container",
		container_port=80,
	)],
    opts=pulumi.ResourceOptions(depends_on=[flask_listener]),
)

# Exporting the url of our Flask frontend. We can now connect to our app
pulumi.export("app-url", flask_balancer.dns_name)
