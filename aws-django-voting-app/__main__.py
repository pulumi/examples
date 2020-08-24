# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import json
import base64
import pulumi
import pulumi_aws as aws
import pulumi_docker as docker
import pulumi_mysql as mysql

# Get neccessary settings from the pulumi config
config = pulumi.Config()
admin_name = config.require("sql-admin-name")
admin_password = config.require_secret("sql-admin-password")
user_name = config.require("sql-user-name")
user_password = config.require_secret("sql-user-password")
availability_zone = pulumi.Config("aws").get("region")

# The ECS cluster in which our application and databse will run
app_cluster = aws.ecs.Cluster("app-cluster")

# Creating a VPC and a public subnet
app_vpc = aws.ec2.Vpc("app-vpc",
    cidr_block="172.31.0.0/16",
    enable_dns_hostnames=True)

app_vpc_subnet = aws.ec2.Subnet("app-vpc-subnet",
    cidr_block="172.31.0.0/20",
    availability_zone=availability_zone + "a",
    vpc_id=app_vpc)

# Creating a gateway to the web for the VPC
app_gateway = aws.ec2.InternetGateway("app-gateway",
    vpc_id=app_vpc.id)

app_routetable = aws.ec2.RouteTable("app-routetable",
    routes=[
        {
            "cidr_block": "0.0.0.0/0",
            "gateway_id": app_gateway.id,
        }
    ],
    vpc_id=app_vpc.id)

# Associating our gateway with our VPC, to allow our app to communicate with the greater internet
app_routetable_association = aws.ec2.MainRouteTableAssociation("app_routetable_association",
    route_table_id=app_routetable.id,
    vpc_id=app_vpc)

# Creating a Security Group that restricts incoming traffic to HTTP
app_security_group = aws.ec2.SecurityGroup("security-group",
	vpc_id=app_vpc.id,
	description="Enables HTTP access",
    ingress=[{
		'protocol': 'tcp',
		'from_port': 0,
		'to_port': 65535,
		'cidr_blocks': ['0.0.0.0/0'],
    }],
    egress=[{
		'protocol': '-1',
		'from_port': 0,
		'to_port': 0,
		'cidr_blocks': ['0.0.0.0/0'],
    }])

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
	policy_arn="arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess")

task_policy_attachment = aws.iam.RolePolicyAttachment("app-lambda-policy", role=app_task_role.name,
	policy_arn="arn:aws:iam::aws:policy/AWSLambdaFullAccess")

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

# The application's backend and data layer: MySQL

# Creating an RDS instance requires having two subnets
extra_rds_subnet = aws.ec2.Subnet("extra-rds-subnet",
    cidr_block="172.31.128.0/20",
    availability_zone=availability_zone + "b",
    vpc_id=app_vpc)

# Both subnets are assigned to a SubnetGroup used by the RDS instance
app_database_subnetgroup = aws.rds.SubnetGroup("app-database-subnetgroup",
    subnet_ids=[app_vpc_subnet.id, extra_rds_subnet.id])

# An RDS instnace is created to hold our MySQL database
mysql_rds_server = aws.rds.Instance("mysql-server",
    engine="mysql",
    username=admin_name,
    password=admin_password,
    instance_class="db.t2.micro",
    allocated_storage=20,
    skip_final_snapshot=True,
    publicly_accessible=True,
    db_subnet_group_name=app_database_subnetgroup.id,
    vpc_security_group_ids=[app_security_group.id])

# Creating a Pulumi MySQL provider to allow us to interact with the RDS instance
mysql_provider = mysql.Provider("mysql-provider",
    endpoint=mysql_rds_server.endpoint,
    username=admin_name,
    password=admin_password)

# Initializing a basic database on the RDS instance
mysql_database = mysql.Database("mysql-database",
    name="votes",
    opts=pulumi.ResourceOptions(provider=mysql_provider))

# Creating a user which will be used to manage MySQL tables 
mysql_user = mysql.User("mysql-standard-user",
    user=user_name,
    host="%", # "%" indicates that the connection is allowed to come from anywhere
    plaintext_password=user_password,
    opts=pulumi.ResourceOptions(provider=mysql_provider))

# The user only needs the "SELECT", "UPDATE", "INSERT", and "DELETE" permissions to function
mysql_access_grant = mysql.Grant("mysql-access-grant",
    user=mysql_user.user,
    host=mysql_user.host,
    database=mysql_database.name,
    privileges= ["SELECT", "UPDATE", "INSERT", "DELETE"],
    opts=pulumi.ResourceOptions(provider=mysql_provider))

# The application's frontend: A Django service

# Creating a target group through which the Flask frontend receives requests
django_targetgroup = aws.lb.TargetGroup("django-targetgroup",
	port=80,
	protocol="TCP",
	target_type="ip",
    stickiness= {
        "enabled": False,
        "type": "lb_cookie",
    },
	vpc_id=app_vpc.id)

# Creating a load balancer to spread out incoming requests
django_balancer = aws.lb.LoadBalancer("django-balancer",
    load_balancer_type="network",
    internal=False,
    security_groups=[],
    subnets=[app_vpc_subnet.id])

# Forwards all public traffic using port 80 to the Flask target group
django_listener = aws.lb.Listener("django-listener",
	load_balancer_arn=django_balancer.arn,
	port=80,
    protocol="TCP",
	default_actions=[{
		"type": "forward",
		"target_group_arn": django_targetgroup.arn
	}])

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

django_image = docker.Image("django-dockerimage",
    image_name=app_ecr_repo.repository_url,
    build="./frontend",
    skip_push=False,
    registry=app_registry
)

# Creating a task definition for the Flask instance.
django_task_definition = aws.ecs.TaskDefinition("django-task-definition",
    family="frontend-task-definition-family",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    requires_compatibilities=["FARGATE"],
    execution_role_arn=app_exec_role.arn,
    task_role_arn=app_task_role.arn,
    container_definitions=pulumi.Output.all(
            django_image.image_name,
            mysql_database.name,
            user_name,
            user_password, 
            mysql_rds_server.address,
            mysql_rds_server.port).apply(lambda args: json.dumps([{
        "name": "django-container",
        "image": args[0],
        "memory": 512,
        "essential": True,
        "portMappings": [{
            "containerPort": 80,
            "hostPort": 80,
            "protocol": "tcp"
        }],
        "environment": [
            { "name": "DATABASE_NAME", "value": args[1]  },
            { "name": "USER_NAME", "value": args[2]  },
            { "name": "USER_PASSWORD", "value": args[3]  },
            { "name": "DATABASE_ADDRESS", "value": args[4]  },
            { "name": "DATABASE_PORT", "value": str(int(args[5]))  },
        ],
    }])))

# Launching our Django service on Fargate, using our configurations and load balancers
django_service = aws.ecs.Service("django-service",
	cluster=app_cluster.arn,
    desired_count=1,
    launch_type="FARGATE",
    task_definition=django_task_definition.arn,
    wait_for_steady_state=False,
    network_configuration={
		"assign_public_ip": "true",
		"subnets": [app_vpc_subnet.id],
		"security_groups": [app_security_group.id]
	},
    load_balancers=[{
		"target_group_arn": django_targetgroup.arn,
		"container_name": "django-container",
		"container_port": 80,
	}],
    opts=pulumi.ResourceOptions(depends_on=[django_listener]),
)

# Exporting the url of our Flask frontend. We can now connect to our app
pulumi.export("app-url", django_balancer.dns_name)

pulumi.export("RDS server", mysql_rds_server.endpoint)