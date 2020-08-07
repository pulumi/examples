# Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import json
import pulumi
import pulumi_aws as aws
import pulumi_docker as docker

# Get the password to use for Redis from config.
config = pulumi.Config()
redis_password = config.require("redis-password")
redis_port = 6379

app_cluster = aws.ecs.Cluster("app-cluster")

# Read back the default VPC and public subnets, which we will use.
app_vpc = aws.ec2.get_vpc(default="true")
app_vpc_subnets = aws.ec2.get_subnet_ids(vpc_id=app_vpc.id)

# Create a SecurityGroup that permits HTTP ingress and unrestricted egress.
app_security_group = aws.ec2.SecurityGroup("web-secgrp",
	vpc_id=app_vpc.id,
	description="Enables HTTP access",
	ingress=[{
		"protocol": "tcp",
		"from_port": 80,
		"to_port": 80,
		"cidr_blocks": ["0.0.0.0/0"],
	}],
  	egress=[{
		"protocol": "-1",
		"from_port": 0,
		"to_port": 0,
		"cidr_blocks": ["0.0.0.0/0"],
	}]
)

# Create an IAM role that can be used by our service's task.
app_exec_role = aws.iam.Role("app-exec-role",
    assume_role_policy="""{
        "Version": "2012-10-17",
        "Statement": [
        {
            "Action": "sts:AssumeRole",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Effect": "Allow",
            "Sid": ""
        }]
    }""")

exec_policy_attachment = aws.iam.RolePolicyAttachment("task-exec-policy", role=app_exec_role.name,
	policy_arn="arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy")

# The data layer for the application
# Use the 'image' property to point to a pre-built Docker image.
redis_balancer = aws.lb.LoadBalancer("redis-balancer",
	security_groups=[app_security_group.id],
	subnets=app_vpc_subnets.ids)

redis_targetgroup = aws.lb.TargetGroup("redis-targetgroup",
	port=redis_port,
	protocol="HTTP",
	target_type="ip",
	vpc_id=app_vpc.id)

redis_listener = aws.lb.Listener("redis-cache",
	load_balancer_arn=redis_balancer.arn,
	port=redis_port,
	default_actions=[{
		"type": "forward",
		"target_group_arn": redis_targetgroup.arn
	}])

redis_task_definition = aws.ecs.TaskDefinition("redis-task-definition",
    family="redis-task-definition",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    requires_compatibilities=["FARGATE"],
    execution_role_arn=app_exec_role.arn,
    container_definitions={
        "containers": {
            "redis": {
                "image": "redis:alpine",
                "memory": 512,
                "portMappings": [redis_listener],
                "command": ["redis-server", "--requirepass", redis_port],
            },
        }
	})

redis_cache = aws.ecs.Service("redis-cache",
	cluster=app_cluster.arn,
    desired_count=1,
    launch_type="FARGATE",
    task_definition=redis_task_definition.arn,
    network_configuration={
		"assign_public_ip": "false",
		"subnets": app_vpc_subnets.ids,
		"security_groups": [app_security_group.id]
	},
    load_balancers=[{
		"target_group_arn": redis_targetgroup.arn,
		"container_name": "redis",
		"container_port": redis_port,
	}],
    opts=pulumi.ResourceOptions(depends_on=[redis_listener]),
)

redis_endpoint = redis_listener.default_actions["userInfoEndpoint"]

# A custom container for the frontend, which is a Python Flask app
# Use the 'build' property to specify a folder that contains a Dockerfile.
# Pulumi builds the container for you and pushes to an ECR registry
frontend_balancer = aws.lb.LoadBalancer("frontend-balancer",
	security_groups=[app_security_group.id],
	subnets=app_vpc_subnets.ids)

frontend_targetgroup = aws.lb.TargetGroup("frontend-targetgroup",
	port=80,
	protocol="HTTP",
	target_type="ip",
	vpc_id=app_vpc.id)

frontend_listener = aws.lb.Listener("frontend-cache",
	load_balancer_arn=frontend_balancer.arn,
	port=80,
	default_actions=[{
		"type": "forward",
		"target_group_arn": frontend_targetgroup.arn
	}])

frontend_image = docker.Image("frontend-image",
    image_name="./frontend",
    build=DockerBuild(
        target="dependencies",
    ),
    skip_push=True,
)

frontend_task_definition = aws.ecs.TaskDefinition("frontend-task-definition",
    family="redis-task-definition",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    requires_compatibilities=["FARGATE"],
    execution_role_arn=app_exec_role.arn,
    container_definitions={
        "votingAppFrontend": {
            "image": frontend_image,
            "memory": 512,
            "portMappings": [frontendListener],
            "environment": redisEndpoint.apply(lambda e => [
                { "name": "REDIS", value: e["hostname"] },
                { "name": "REDIS_PORT", value: e["port"] },
                { "name": "REDIS_PWD", value: redisPassword },
            ]),
        },
	})

frontend = aws.ecs.Service("frontend-service",
	cluster=app_cluster.arn,
    desired_count=3,
    launch_type="FARGATE",
    task_definition=frontend_task_definition.arn,
    network_configuration={
		"assign_public_ip": "false",
		"subnets": app_vpc_subnets.ids,
		"security_groups": [app_security_group.id]
	},
    load_balancers=[{
		"target_group_arn": frontend_targetgroup.arn,
		"container_name": "redis",
		"container_port": 80,
	}],
    opts=pulumi.ResourceOptions(depends_on=[frontend_listener]),
)

pulumi.export("app-url", frontendListener.default_actions["userInfoEndpoint"])
