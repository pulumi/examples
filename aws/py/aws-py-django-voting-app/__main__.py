# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import base64
import json

import pulumi
import pulumi_aws as aws
import pulumi_docker as docker
import pulumi_mysql as mysql

# Get neccessary settings from the pulumi config
config = pulumi.Config()
sql_admin_name = config.require("sql-admin-name")
sql_admin_password = config.require_secret("sql-admin-password")
sql_user_name = config.require("sql-user-name")
sql_user_password = config.require_secret("sql-user-password")
availability_zone = aws.config.region

# Credentials for the Django site administration panel
django_admin_name = config.require("django-admin-name")
django_admin_password = config.require_secret("django-admin-password")

# A random 50-character string
django_secret_key = config.require_secret("django-secret-key")

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
        aws.ec2.RouteTableRouteArgs(
            cidr_block="0.0.0.0/0",
            gateway_id=app_gateway.id,
        )
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
    ingress=[aws.ec2.SecurityGroupIngressArgs(
		protocol="tcp",
		from_port=0,
		to_port=65535,
		cidr_blocks=["0.0.0.0/0"],
    )],
    egress=[aws.ec2.SecurityGroupEgressArgs(
		protocol="-1",
		from_port=0,
		to_port=0,
		cidr_blocks=["0.0.0.0/0"],
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
    policy_arn=aws.iam.ManagedPolicy.AMAZON_ECS_TASK_EXECUTION_ROLE_POLICY)

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
    username=sql_admin_name,
    password=sql_admin_password,
    instance_class="db.t2.micro",
    allocated_storage=20,
    skip_final_snapshot=True,
    publicly_accessible=True,
    db_subnet_group_name=app_database_subnetgroup.id,
    vpc_security_group_ids=[app_security_group.id])

# Creating a Pulumi MySQL provider to allow us to interact with the RDS instance
mysql_provider = mysql.Provider("mysql-provider",
    endpoint=mysql_rds_server.endpoint,
    username=sql_admin_name,
    password=sql_admin_password)

# Initializing a basic database on the RDS instance
mysql_database = mysql.Database("mysql-database",
    name="votes",
    opts=pulumi.ResourceOptions(provider=mysql_provider))

# Creating a user which will be used to manage MySQL tables
mysql_user = mysql.User("mysql-standard-user",
    user=sql_user_name,
    host="%", # "%" indicates that the connection is allowed to come from anywhere
    plaintext_password=sql_user_password,
    opts=pulumi.ResourceOptions(provider=mysql_provider))

# The user only needs the "SELECT", "UPDATE", "INSERT", and "DELETE" permissions to function
mysql_access_grant = mysql.Grant("mysql-access-grant",
    user=mysql_user.user,
    host=mysql_user.host,
    database=mysql_database.name,
    privileges= ["SELECT", "UPDATE", "INSERT", "DELETE"],
    opts=pulumi.ResourceOptions(provider=mysql_provider))

# The application's frontend: A Django service

# Creating a target group through which the Django frontend receives requests
django_targetgroup = aws.lb.TargetGroup("django-targetgroup",
	port=80,
	protocol="TCP",
	target_type="ip",
    stickiness=aws.lb.TargetGroupStickinessArgs(
        enabled=False,
        type="lb_cookie",
    ),
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
    default_actions=[aws.lb.ListenerDefaultActionArgs(
        type="forward",
        target_group_arn=django_targetgroup.arn,
    )])

# Creating a Docker image from "./frontend/Dockerfile", which we will use
# to upload our app

def get_registry_info(creds):
    decoded = base64.b64decode(creds.authorization_token).decode()
    parts = decoded.split(':')
    if len(parts) != 2:
        raise Exception("Invalid credentials")

    username = parts[0]
    password = parts[1]
    return docker.ImageRegistry(
        server=creds.proxy_endpoint,
        username=username,
        password=password)

app_registry = aws.ecr.get_credentials_output(app_ecr_repo.registry_id) \
                      .apply(get_registry_info)

django_image = docker.Image("django-dockerimage",
    image_name=app_ecr_repo.repository_url,
    build="./frontend",
    skip_push=False,
    registry=app_registry
)

# Creating a Cloudwatch instance to store the logs that the ECS services produce
django_log_group = aws.cloudwatch.LogGroup("django-log-group",
    retention_in_days=1,
    name="django-log-group"
)

# Creating a task definition for the first Django instance. This task definition
# will migrate the database, create a site admin account, and will automatcially
# exit when it is finished.
django_database_task_definition = aws.ecs.TaskDefinition("django-database-task-definition",
    family="django_database_task_definition-family",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    requires_compatibilities=["FARGATE"],
    execution_role_arn=app_exec_role.arn,
    task_role_arn=app_task_role.arn,
    container_definitions=pulumi.Output.json_dumps([{
        "name": "django-container",
        "image": django_image.image_name,
        "memory": 512,
        "essential": True,
        "portMappings": [{
            "containerPort": 80,
            "hostPort": 80,
            "protocol": "tcp"
        }],
        "environment": [
            { "name": "SECRET_KEY", "value": django_secret_key  },
            { "name": "DATABASE_NAME", "value": mysql_database.name  },
            { "name": "USER_NAME", "value": sql_admin_name },
            { "name": "USER_PASSWORD", "value": sql_admin_password  },
            { "name": "DJANGO_NAME", "value": django_admin_name  },
            { "name": "DJANGO_PASSWORD", "value": django_admin_password  },
            { "name": "DATABASE_ADDRESS", "value": mysql_rds_server.address  },
            { "name": "DATABASE_PORT", "value": mysql_rds_server.port.apply(lambda x: str(int(x))) },
        ],
        "logConfiguration": {
            "logDriver": "awslogs",
            "options": {
                "awslogs-group": "django-log-group",
                "awslogs-region": "us-west-2",
                "awslogs-stream-prefix": "djangoApp-database",
            },
        },
        "command": ["/mysite/setupDatabase.sh"]
    }]))

# Launching our Django service on Fargate, using our configurations and load balancers
django_database_service = aws.ecs.Service("django-database-service",
    cluster=app_cluster.arn,
    desired_count=1,
    launch_type="FARGATE",
    task_definition=django_database_task_definition.arn,
    wait_for_steady_state=False,
    network_configuration=aws.ecs.ServiceNetworkConfigurationArgs(
        assign_public_ip=True,
        subnets=[app_vpc_subnet.id],
        security_groups=[app_security_group.id],
    ),
    load_balancers=[aws.ecs.ServiceLoadBalancerArgs(
        target_group_arn=django_targetgroup.arn,
        container_name="django-container",
        container_port=80,
    )],
    opts=pulumi.ResourceOptions(depends_on=[django_listener]),
)

# Creating a task definition for the second Django instance. This instance will
# act as the server, and will run indefinately
django_site_task_definition = aws.ecs.TaskDefinition("django-site-task-definition",
    family="django-site-task-definition-family",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    requires_compatibilities=["FARGATE"],
    execution_role_arn=app_exec_role.arn,
    task_role_arn=app_task_role.arn,
    container_definitions=pulumi.Output.json_dumps([{
        "name": "django-container",
        "image": django_image.image_name,
        "memory": 512,
        "essential": True,
        "portMappings": [{
            "containerPort": 80,
            "hostPort": 80,
            "protocol": "tcp"
        }],
        "environment": [
            { "name": "SECRET_KEY", "value": django_secret_key  },
            { "name": "DATABASE_NAME", "value": mysql_database.name  },
            { "name": "USER_NAME", "value": sql_user_name  },
            { "name": "USER_PASSWORD", "value": sql_user_password  },
            { "name": "DATABASE_ADDRESS", "value": mysql_rds_server.address  },
            { "name": "DATABASE_PORT", "value": mysql_rds_server.port.apply(lambda x: str(int(x))) },
        ],
        "logConfiguration": {
            "logDriver": "awslogs",
            "options": {
                "awslogs-group": "django-log-group",
                "awslogs-region": "us-west-2",
                "awslogs-stream-prefix": "djangoApp-site",
            },
        },
    }]))

# Launching our Django service on Fargate, using our configurations and load balancers
django_site_service = aws.ecs.Service("django-site-service",
    cluster=app_cluster.arn,
    desired_count=1,
    launch_type="FARGATE",
    task_definition=django_site_task_definition.arn,
    wait_for_steady_state=False,
    network_configuration=aws.ecs.ServiceNetworkConfigurationArgs(
        assign_public_ip=True,
        subnets=[app_vpc_subnet.id],
        security_groups=[app_security_group.id],
    ),
    load_balancers=[aws.ecs.ServiceLoadBalancerArgs(
        target_group_arn=django_targetgroup.arn,
        container_name="django-container",
        container_port=80,
    )],
    opts=pulumi.ResourceOptions(depends_on=[django_listener]),
)

# Exporting the url of our Django site. We can now connect to our app. To access
# Django administration, add "/admin/" to the end of the url.
pulumi.export("app-url", django_balancer.dns_name)
