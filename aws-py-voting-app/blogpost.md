    Creating a Python AWS Application Using Flask, Redis, and Pulumi

Having recently begun developing with Pulumi, I have taken it upon myself to learn as much about its inner workings and processes as I could. To that end, I have decided to construct a production-level application using it, and to document each step that I take and its impact on my progress as I go along. 

This blog post will feature an existing [Typescript voting app example](https://www.pulumi.com/docs/tutorials/aws/aws-ts-voting-app/) be fully re-created step by step in Python, using Flask as the frontend, and Redis as the backend. In future blog posts, we will explore how to change the front and backends, how to upgrade the app with additional AWS services, and even how to migrate from one cloud provider to another.

---

The first few lines of the __main\__.py file indicate which libraries need to be imported, and describe a pair of configuration options that will be used by the application.
```python
import json
import pulumi
import pulumi_aws as aws
import pulumi_docker as docker

config = pulumi.Config()
redis_password = config.require("redis-password")
redis_port = 6379
```


After setting up the imports and configurations, we create an Elastic Container Service Cluster. 
A Cluster represent a group of tasks and services that work together for a certain purpose. In 
this instance, the purpose is to provide users with a voting application.  
```python
app_cluster = aws.ecs.Cluster("app-cluster")
```


In order to allow different tasks within our cluster to communicate, we create a Virtual Private 
Cloud and an associated subnet.
```python
app_vpc = aws.ec2.Vpc("app-vpc",
    cidr_block="172.31.0.0/16",
    enable_dns_hostnames=True)

app_vpc_subnet = aws.ec2.Subnet("app-vpc-subnet",
    cidr_block="172.31.32.0/20",
    vpc_id=app_vpc)
```


A gateway and routing table are needed to allow the VPC to communicate with the greater internet. 
Once created, we declare that the routing table is associated with our VPC.
```python
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

app_routetable_association = aws.ec2.MainRouteTableAssociation("app_routetable_association",
    route_table_id=app_routetable.id,
    vpc_id=app_vpc)
```


To inform what kinds of internet traffic are and aren't allowed to connect with the application, 
we create a firewall in the form of a security group.
```python
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
```


In order to allow our services to start, we create an Identity and Access Management role, and 
attach execution permissions to it.
```python
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

exec_policy_attachment = aws.iam.RolePolicyAttachment("app-exec-policy", role=app_exec_role.name,
	policy_arn="arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy")
```

---

The full code for the blog post can be [found on github.](https://github.com/jetvova/examples/tree/vova/aws-py-flask-redis-voting-app/aws-py-voting-app)











