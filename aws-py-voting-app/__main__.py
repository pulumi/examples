# Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

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

# Creating a default VPC and public subnets
app_vpc = aws.ec2.get_vpc(default="true")
app_vpc_subnets = aws.ec2.get_subnet_ids(vpc_id=app_vpc.id)

# Creating a Security Group that restricts incoming traffic to HTTP
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

# Creating an IAM role used by Fargate to execute all our tasks
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

# Attaching execution permissions to the IAM role
exec_policy_attachment = aws.iam.RolePolicyAttachment("task-exec-policy", role=app_exec_role.name,
	policy_arn="arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy")

# The application's backend and data layer: Redis

# Creating a target group through which the Redis backend receives requests
redis_targetgroup = aws.lb.TargetGroup("redis-targetgroup",
	port=redis_port,
	protocol="HTTP",
	target_type="ip",
	vpc_id=app_vpc.id)

# Creating a load balancer to spread out incoming requests
redis_balancer = aws.lb.LoadBalancer("redis-balancer",
	security_groups=[app_security_group.id],
	subnets=app_vpc_subnets.ids)

# Forwards internal traffic with the Redis port number to the Redis target group
redis_listener = aws.lb.Listener("redis-listener",
	load_balancer_arn=redis_balancer.arn,
	port=redis_port,
	default_actions=[{
		"type": "forward",
		"target_group_arn": redis_targetgroup.arn
	}])

# Creating a task definition for the Redis instance.
redis_task_definition = aws.ecs.TaskDefinition("redis-task-definition",
    family="redis-task-definition-family",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    requires_compatibilities=["FARGATE"],
    execution_role_arn=app_exec_role.arn,
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
		"container_name": "redis-container",
		"container_port": redis_port,
	}],
    opts=pulumi.ResourceOptions(depends_on=[redis_listener]),
)

# Creating a special endpoint for the Redis backend, which we will provide 
# to the Flask service as an environment variable
redis_endpoint = {"host": str(redis_balancer.dns_name), "port": str(redis_listener.port)}

# The application's frontend: A Flask service

# Creating a target group through which the Flask frontend receives requests
frontend_targetgroup = aws.lb.TargetGroup("frontend-targetgroup",
	port=80,
	protocol="HTTP",
	target_type="ip",
	vpc_id=app_vpc.id)

# Creating a load balancer to spread out incoming requests
frontend_balancer = aws.lb.LoadBalancer("frontend-balancer",
	security_groups=[app_security_group.id],
    subnets=app_vpc_subnets.ids)

# Forwards all public traffic using port 80 to the Flask target group
frontend_listener = aws.lb.Listener("frontend-listener",
	load_balancer_arn=frontend_balancer.arn,
	port=80,
	default_actions=[{
		"type": "forward",
		"target_group_arn": frontend_targetgroup.arn
	}])

# Creating a Docker image from "./frontend/Dockerfile", which we will use
# to upload our app
frontend_image = docker.Image("frontend-dockerimage",
    image_name="frontend-dockerimage",
    build=docker.DockerBuild(
        context="./frontend",
    ),
    skip_push=True,
)

# Creating a task definition for the Flask instance.
frontend_task_definition = aws.ecs.TaskDefinition("frontend-task-definition",
    family="frontend-task-definition",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    requires_compatibilities=["FARGATE"],
    execution_role_arn=app_exec_role.arn,
    container_definitions=json.dumps([{
        "name": "votingAppFrontend",
        "image": "frontend-dockerimage",
        "memory": 512,
        "essential": True,
        "portMappings": [{
            "containerPort": 80,
            "hostPort": 80,
            "protocol": "tcp"
        }],
        "environment": [ # The Redis endpoint we created is given to Flask, allowing it to communicate with the former
            { "name": "REDIS_HOST", "value": redis_endpoint["host"] },
            { "name": "REDIS_PORT", "value": redis_endpoint["port"] },
            { "name": "REDIS_PWD", "value": redis_password },
        ],
	}]))

# Launching our Redis service on Fargate, using our configurations and load balancers
flask_frontend = aws.ecs.Service("flask-service",
	cluster=app_cluster.arn,
    desired_count=3,
    launch_type="FARGATE",
    task_definition=frontend_task_definition.arn,
    network_configuration={
		"assign_public_ip": "true",
		"subnets": app_vpc_subnets.ids,
		"security_groups": [app_security_group.id]
	},
    load_balancers=[{
		"target_group_arn": frontend_targetgroup.arn,
		"container_name": "votingAppFrontend",
		"container_port": 80,
	}],
    opts=pulumi.ResourceOptions(depends_on=[frontend_listener]),
)

# Exporting the url of our Flask frontend. We can now connect to our app
pulumi.export("app-url", frontend_balancer.dns_name)
pulumi.export("redis-url", redis_balancer.dns_name)
