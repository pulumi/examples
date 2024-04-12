# Copyright 2016-2024, Pulumi Corporation.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import pulumi
import json
import pulumi_aws as aws
import pulumi_docker as docker

config = pulumi.Config()
vpc_cidr = config.get("vpc-cidr")
if vpc_cidr is None:
    vpc_cidr = "10.0.0.0/16"
subnet1_cidr = config.get("subnet-1-cidr")
if subnet1_cidr is None:
    subnet1_cidr = "10.0.0.0/24"
subnet2_cidr = config.get("subnet-2-cidr")
if subnet2_cidr is None:
    subnet2_cidr = "10.0.1.0/24"
container_context = config.get("container-context")
if container_context is None:
    container_context = "."
container_file = config.get("container-file")
if container_file is None:
    container_file = "./Dockerfile"
open_api_key = config.get("open-api-key")
if open_api_key is None:
    open_api_key = "CHANGEME"
availability_zones = [
    "eu-central-1a",
    "eu-central-1b",
]
current = aws.get_caller_identity_output()
pulumi_project = pulumi.get_project()
pulumi_stack = pulumi.get_stack()
langserve_ecr_repository = aws.ecr.Repository("langserve-ecr-repository",
    name=f"{pulumi_project}-{pulumi_stack}",
    force_delete=True)
token = aws.ecr.get_authorization_token_output(registry_id=langserve_ecr_repository.registry_id)
account_id = current.account_id
langserve_ecr_life_cycle_policy = aws.ecr.LifecyclePolicy("langserve-ecr-life-cycle-policy",
    repository=langserve_ecr_repository.name,
    policy=json.dumps({
        "rules": [{
            "rulePriority": 1,
            "description": "Expire images when they are more than 10 available",
            "selection": {
                "tagStatus": "any",
                "countType": "imageCountMoreThan",
                "countNumber": 10,
            },
            "action": {
                "type": "expire",
            },
        }],
    }))
langserve_ecr_image = docker.Image("langserve-ecr-image",
    build=docker.DockerBuildArgs(
        platform="linux/amd64",
        context=container_context,
        dockerfile=container_file,
    ),
    image_name=langserve_ecr_repository.repository_url,
    registry=docker.RegistryArgs(
        server=langserve_ecr_repository.repository_url,
        username=token.user_name,
        password=pulumi.Output.secret(token.password),
    ))
langserve_vpc = aws.ec2.Vpc("langserve-vpc",
    cidr_block=vpc_cidr,
    enable_dns_hostnames=True,
    enable_dns_support=True,
    instance_tenancy="default",
    tags={
        "Name": f"{pulumi_project}-{pulumi_stack}",
    })
langserve_rt = aws.ec2.RouteTable("langserve-rt",
    vpc_id=langserve_vpc.id,
    tags={
        "Name": f"{pulumi_project}-{pulumi_stack}",
    })
langserve_igw = aws.ec2.InternetGateway("langserve-igw",
    vpc_id=langserve_vpc.id,
    tags={
        "Name": f"{pulumi_project}-{pulumi_stack}",
    })
langserve_route = aws.ec2.Route("langserve-route",
    route_table_id=langserve_rt.id,
    destination_cidr_block="0.0.0.0/0",
    gateway_id=langserve_igw.id)
langserve_subnet1 = aws.ec2.Subnet("langserve-subnet1",
    vpc_id=langserve_vpc.id,
    cidr_block=subnet1_cidr,
    availability_zone=availability_zones[0],
    map_public_ip_on_launch=True,
    tags={
        "Name": f"{pulumi_project}-{pulumi_stack}-1",
    })
langserve_subnet2 = aws.ec2.Subnet("langserve-subnet2",
    vpc_id=langserve_vpc.id,
    cidr_block=subnet2_cidr,
    availability_zone=availability_zones[1],
    map_public_ip_on_launch=True,
    tags={
        "Name": f"{pulumi_project}-{pulumi_stack}-2",
    })
langserve_subnet1_rt_assoc = aws.ec2.RouteTableAssociation("langserve-subnet1-rt-assoc",
    subnet_id=langserve_subnet1.id,
    route_table_id=langserve_rt.id)
langserve_subnet2_rt_assoc = aws.ec2.RouteTableAssociation("langserve-subnet2-rt-assoc",
    subnet_id=langserve_subnet2.id,
    route_table_id=langserve_rt.id)
langserve_ecs_cluster = aws.ecs.Cluster("langserve-ecs-cluster",
    configuration=aws.ecs.ClusterConfigurationArgs(
        execute_command_configuration=aws.ecs.ClusterConfigurationExecuteCommandConfigurationArgs(
            logging="DEFAULT",
        ),
    ),
    settings=[aws.ecs.ClusterSettingArgs(
        name="containerInsights",
        value="disabled",
    )],
    tags={
        "Name": f"{pulumi_project}-{pulumi_stack}",
    })
langserve_cluster_capacity_providers = aws.ecs.ClusterCapacityProviders("langserve-cluster-capacity-providers",
    cluster_name=langserve_ecs_cluster.name,
    capacity_providers=[
        "FARGATE",
        "FARGATE_SPOT",
    ])
langserve_security_group = aws.ec2.SecurityGroup("langserve-security-group",
    vpc_id=langserve_vpc.id,
    ingress=[aws.ec2.SecurityGroupIngressArgs(
        protocol="tcp",
        from_port=80,
        to_port=80,
        cidr_blocks=["0.0.0.0/0"],
    )],
    egress=[aws.ec2.SecurityGroupEgressArgs(
        protocol="-1",
        from_port=0,
        to_port=0,
        cidr_blocks=["0.0.0.0/0"],
    )])
langserve_load_balancer = aws.lb.LoadBalancer("langserve-load-balancer",
    load_balancer_type="application",
    security_groups=[langserve_security_group.id],
    subnets=[
        langserve_subnet1.id,
        langserve_subnet2.id,
    ])
langserve_target_group = aws.lb.TargetGroup("langserve-target-group",
    port=80,
    protocol="HTTP",
    target_type="ip",
    vpc_id=langserve_vpc.id)
langserve_listener = aws.lb.Listener("langserve-listener",
    load_balancer_arn=langserve_load_balancer.arn,
    port=80,
    protocol="HTTP",
    default_actions=[aws.lb.ListenerDefaultActionArgs(
        type="forward",
        target_group_arn=langserve_target_group.arn,
    )])
langserve_log_group = aws.cloudwatch.LogGroup("langserve-log-group", retention_in_days=7)
langserve_key = aws.kms.Key("langserve-key",
    description="Key for encrypting secrets",
    enable_key_rotation=True,
    policy=account_id.apply(lambda account_id: json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": f"arn:aws:iam::{account_id}:root",
                },
                "Action": [
                    "kms:Create*",
                    "kms:Describe*",
                    "kms:Enable*",
                    "kms:List*",
                    "kms:Put*",
                    "kms:Update*",
                    "kms:Revoke*",
                    "kms:Disable*",
                    "kms:Get*",
                    "kms:Delete*",
                    "kms:ScheduleKeyDeletion",
                    "kms:CancelKeyDeletion",
                    "kms:Tag*",
                    "kms:UntagResource",
                ],
                "Resource": "*",
            },
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": f"arn:aws:iam::{account_id}:root",
                },
                "Action": [
                    "kms:Encrypt",
                    "kms:Decrypt",
                    "kms:ReEncrypt*",
                    "kms:GenerateDataKey*",
                    "kms:DescribeKey",
                ],
                "Resource": "*",
            },
        ],
    })),
    tags={
        "pulumi-application": pulumi_project,
        "pulumi-environment": pulumi_stack,
    })
langserve_ssm_parameter = aws.ssm.Parameter("langserve-ssm-parameter",
    type="SecureString",
    value=open_api_key,
    key_id=langserve_key.key_id,
    name=f"/pulumi/{pulumi_project}/{pulumi_stack}/OPENAI_API_KEY",
    tags={
        "pulumi-application": pulumi_project,
        "pulumi-environment": pulumi_stack,
    })

langserve_execution_role = aws.iam.Role("langserve-execution-role",
    assume_role_policy=json.dumps({
        "Statement": [{
            "Action": "sts:AssumeRole",
            "Effect": "Allow",
            "Principal": {
                "Service": "ecs-tasks.amazonaws.com",
            },
        }],
        "Version": "2012-10-17",
    }),
    inline_policies=[aws.iam.RoleInlinePolicyArgs(
        name=f"{pulumi_project}-{pulumi_stack}-service-secrets-policy",
        policy=pulumi.Output.all(langserve_ssm_parameter.arn, langserve_key.arn).apply(lambda args: json.dumps({
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": ["ssm:GetParameters"],
                    "Condition": {
                        "StringEquals": {
                            "ssm:ResourceTag/pulumi-application": pulumi_project,
                            "ssm:ResourceTag/pulumi-environment": pulumi_stack,
                        },
                    },
                    "Effect": "Allow",
                    "Resource": [args[0]],
                },
                {
                    "Action": ["kms:Decrypt"],
                    "Condition": {
                        "StringEquals": {
                            "aws:ResourceTag/pulumi-application": pulumi_project,
                            "aws:ResourceTag/pulumi-environment": pulumi_stack,
                        },
                    },
                    "Effect": "Allow",
                    "Resource": [args[1]],
                    "Sid": "DecryptTaggedKMSKey",
                },
            ],
        })),
    )],
    managed_policy_arns=["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"])

langserve_task_role = aws.iam.Role("langserve-task-role",
    assume_role_policy=json.dumps({
        "Statement": [{
            "Action": "sts:AssumeRole",
            "Effect": "Allow",
            "Principal": {
                "Service": "ecs-tasks.amazonaws.com",
            },
        }],
        "Version": "2012-10-17",
    }),
    inline_policies=[
        aws.iam.RoleInlinePolicyArgs(
            name="ExecuteCommand",
            policy=json.dumps({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Action": [
                            "ssmmessages:CreateControlChannel",
                            "ssmmessages:OpenControlChannel",
                            "ssmmessages:CreateDataChannel",
                            "ssmmessages:OpenDataChannel",
                        ],
                        "Effect": "Allow",
                        "Resource": "*",
                    },
                    {
                        "Action": [
                            "logs:CreateLogStream",
                            "logs:DescribeLogGroups",
                            "logs:DescribeLogStreams",
                            "logs:PutLogEvents",
                        ],
                        "Effect": "Allow",
                        "Resource": "*",
                    },
                ],
            }),
        ),
        aws.iam.RoleInlinePolicyArgs(
            name="DenyIAM",
            policy=json.dumps({
                "Version": "2012-10-17",
                "Statement": [{
                    "Action": "iam:*",
                    "Effect": "Deny",
                    "Resource": "*",
                }],
            }),
        ),
    ])
langserve_task_definition = aws.ecs.TaskDefinition("langserve-task-definition",
    family=f"{pulumi_project}-{pulumi_stack}",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    execution_role_arn=langserve_execution_role.arn,
    task_role_arn=langserve_task_role.arn,
    requires_compatibilities=["FARGATE"],
    container_definitions=pulumi.Output.all(langserve_ecr_image.repo_digest, langserve_ssm_parameter.name, langserve_log_group.name).apply(lambda args: json.dumps([{
        "name": f"{pulumi_project}-{pulumi_stack}-service",
        "image": args[0],
        "cpu": 0,
        "portMappings": [{
            "name": "target",
            "containerPort": 8080,
            "hostPort": 8080,
            "protocol": "tcp",
        }],
        "essential": True,
        "secrets": [{
            "name": "OPENAI_API_KEY",
            "valueFrom": args[1],
        }],
        "logConfiguration": {
            "logDriver": "awslogs",
            "options": {
                "awslogs-group": args[2],
                "awslogs-region": "eu-central-1",
                "awslogs-stream-prefix": "pulumi-langserve",
            },
        },
    }])))
langserve_ecs_security_group = aws.ec2.SecurityGroup("langserve-ecs-security-group",
    vpc_id=langserve_vpc.id,
    ingress=[aws.ec2.SecurityGroupIngressArgs(
        protocol="-1",
        from_port=0,
        to_port=0,
        cidr_blocks=["0.0.0.0/0"],
    )],
    egress=[aws.ec2.SecurityGroupEgressArgs(
        protocol="-1",
        from_port=0,
        to_port=0,
        cidr_blocks=["0.0.0.0/0"],
    )])
langserve_service_discovery_namespace = aws.servicediscovery.PrivateDnsNamespace("langserve-service-discovery-namespace",
    name=f"{pulumi_stack}.{pulumi_project}.local",
    vpc=langserve_vpc.id)
langserve_service = aws.ecs.Service("langserve-service",
    cluster=langserve_ecs_cluster.arn,
    task_definition=langserve_task_definition.arn,
    desired_count=1,
    launch_type="FARGATE",
    network_configuration=aws.ecs.ServiceNetworkConfigurationArgs(
        assign_public_ip=True,
        security_groups=[langserve_ecs_security_group.id],
        subnets=[
            langserve_subnet1.id,
            langserve_subnet2.id,
        ],
    ),
    load_balancers=[aws.ecs.ServiceLoadBalancerArgs(
        target_group_arn=langserve_target_group.arn,
        container_name=f"{pulumi_project}-{pulumi_stack}-service",
        container_port=8080,
    )],
    scheduling_strategy="REPLICA",
    service_connect_configuration=aws.ecs.ServiceServiceConnectConfigurationArgs(
        enabled=True,
        namespace=langserve_service_discovery_namespace.arn,
    ),
    tags={
        "Name": f"{pulumi_project}-{pulumi_stack}",
    })
pulumi.export("url", langserve_load_balancer.dns_name.apply(lambda dns_name: f"http://{dns_name}"))
