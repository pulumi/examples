"""Deploys ECS with EC2 container instances (as opposed to using Fargate)."""
import json
import pulumi
import pulumi_aws as aws

region = aws.config.region or "us-east-1" 
avail_zone = region+"a" # e.g. us-east-1a 

stack_config = pulumi.Config("cfg")
asg_size = int(stack_config.require("autoscalingGroupSize")) 

# Get the default VPC.
default_vpc = aws.ec2.get_vpc(default=True)
default_vpc_subnets = aws.ec2.get_subnets(
    filters = [
        aws.ec2.GetSubnetsFilterArgs(
            name='vpc-id',
            values=[default_vpc.id],
        ),
    ],
)


# Security group to access the nginx container.
sg = aws.ec2.SecurityGroup(
    "nginx-sg",
    description="Allow HTTP",
    vpc_id=default_vpc.id,
    ingress=[
        aws.ec2.SecurityGroupIngressArgs(protocol="tcp", from_port=80, to_port=80, cidr_blocks=["0.0.0.0/0"])
    ],
    egress=[
        aws.ec2.SecurityGroupEgressArgs(protocol=-1, from_port=0, to_port=0, cidr_blocks=["0.0.0.0/0"])
    ]
)

# IAM role for:
# - Task Role: to allow the TaskDefinition to launch tasks on the cluster. 
#   Used in the TaskDefinition declaration below.
task_execution_role = aws.iam.Role(
    "task-execution-role",
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
task_execution_role_policy_attach = aws.iam.RolePolicyAttachment(
    "task-excution-policy-attach",
    role=task_execution_role.name,
    policy_arn="arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
)

# IAM role and profile for:
# - Instance IAM profile: to allow the EC2 instances permission to join the ECS cluster.
#   Used in the Launch Configuration declaration below.
ecs_instance_role = aws.iam.Role(
    "ecs-instance-role",
    assume_role_policy=json.dumps(
        {
            "Version": "2012-10-17",
            "Statement":
            [
                {
                    "Sid": "",
                    "Effect": "Allow",
                    "Principal": {"Service": "ec2.amazonaws.com"},
                    "Action": "sts:AssumeRole"
                }
            ],
        }
    ),
)
ecs_instance_role_policy_attach = aws.iam.RolePolicyAttachment(
    "ecs-instance-policy-attach",
    role=ecs_instance_role.name,
    policy_arn="arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
)
ecs_instance_profile = aws.iam.InstanceProfile("ecs-iam-instance-profile", role=ecs_instance_role.name)

# Find an "ECS optimized" AMI to use for the EC2 container instances.
ecs_instance_ami = aws.ec2.get_ami(
    most_recent="true",
    owners=["amazon"],
    filters=[
        {
            "name": "name",
            "values": ["amzn2-ami-ecs-hvm-*-x86_64-*"]  
        }
    ]
)

# User-data so the EC2 container instance will connect to the created cluster. 
cluster_name = "my-fancy-new-ecs-cluster"
user_data='''#!/bin/bash
echo ECS_CLUSTER={cluster_nm} >> /etc/ecs/ecs.config'''.format(cluster_nm=cluster_name)

# create launch configuration
launch_config = aws.ec2.LaunchConfiguration(
    "launch-config",
    image_id=ecs_instance_ami.id,
    instance_type="t2.micro",
    iam_instance_profile=ecs_instance_profile.name, # needed to give instance authority to join the ECS cluster.
    user_data=user_data, # Required so instance knows to connect to the cluster created below.
)

# Create cluster and related bits (i.e. autoscaling group and CapacityProvider)
auto_scaling = aws.autoscaling.Group(
    "auto-scaling",
    availability_zones=[avail_zone],  
    launch_configuration=launch_config.name,
    min_size=asg_size,
    max_size=asg_size,
    protect_from_scale_in=False
)
cp = aws.ecs.CapacityProvider(
    "capacity-provider",
    auto_scaling_group_provider=aws.ecs.CapacityProviderAutoScalingGroupProviderArgs(
        auto_scaling_group_arn=auto_scaling.arn,
        managed_termination_protection="DISABLED",
        managed_scaling=aws.ecs.CapacityProviderAutoScalingGroupProviderManagedScalingArgs(
            status="DISABLED"
        )
    )
)
cluster = aws.ecs.Cluster(
    "cluster",
    name=cluster_name, # Use explicit name property so that we know the cluster name - this is required for the user data above.
    capacity_providers=[cp.name],
)

# Application load balancer and related bits
load_balancer = aws.lb.LoadBalancer(
    "load-balancer", 
    load_balancer_type="application", 
    security_groups=[sg.id],
    subnets=default_vpc_subnets.ids,
    internal=False,
)
atg = aws.lb.TargetGroup(
    "app-tg",
	port=80,
	protocol="HTTP",
	target_type="ip",
	vpc_id=default_vpc.id,
)
wl = aws.lb.Listener(
    "web",
	load_balancer_arn=load_balancer.arn,
	port=80,
	default_actions=[aws.lb.ListenerDefaultActionArgs(type="forward", target_group_arn=atg.arn)]
)

# Task definition for creating our containers.
task_def = aws.ecs.TaskDefinition(
    "my-app",
    family="ec2-task-definition",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    requires_compatibilities=["EC2"],
    execution_role_arn=task_execution_role.arn,  # Needed so it has permission to launch tasks on the cluster.
    container_definitions=json.dumps([{
		"name": "my-app",
		"image": "nginx", # a simple nginx example
		"portMappings": [{
			"containerPort": 80,
			"hostPort": 80,
			"protocol": "tcp"
		}]
	}]),
    opts=pulumi.ResourceOptions(depends_on=[cluster])
)

# Service declaration to build the service on the ECS cluster.
service = aws.ecs.Service(
    "my-task-runner",
    cluster=cluster.arn,
    launch_type="EC2",
    desired_count=1,
    task_definition=task_def.arn,
    network_configuration=aws.ecs.ServiceNetworkConfigurationArgs(
		assign_public_ip=False,
		subnets=default_vpc_subnets.ids,
		security_groups=[sg.id],
	),
    load_balancers=[aws.ecs.ServiceLoadBalancerArgs(
		target_group_arn=atg.arn,
		container_name="my-app",
		container_port=80,
	)],
    opts=pulumi.ResourceOptions(depends_on=[wl])
)

# Provide a clickable link to the nginx service via the load balancer.
pulumi.export("app_url", pulumi.Output.concat("http://",load_balancer.dns_name))
pulumi.export("NOTE", "You may have to wait a minute for AWS to spin up the service. So if the URL throws a 503 error, try again after a bit.")
