# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import json
import base64
import pulumi
import pulumi_aws as aws
import pulumi_mysql as mysql
from mysql_dynamic_provider import *

# Get neccessary settings from the pulumi config
config = pulumi.Config()
admin_name = config.require("sql-admin-name")
admin_password = config.require_secret("sql-admin-password")
user_name = config.require("sql-user-name")
user_password = config.require_secret("sql-user-password")
availability_zone = aws.config.region

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

# Associating our gateway with our VPC to allow the MySQL database to communicate 
# with the internet
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
    name="votes-database",
    opts=pulumi.ResourceOptions(provider=mysql_provider))

# Creating a user which will be used to manage MySQL tables 
mysql_user = mysql.User("mysql-standard-user",
    user=user_name,
    host="example.com",
    plaintext_password=user_password,
    opts=pulumi.ResourceOptions(provider=mysql_provider))

# The user only needs the "SELECT" and "UPDATE" permissions to function
mysql_access_grant = mysql.Grant("mysql-access-grant",
    user=mysql_user.user,
    host=mysql_user.host,
    database=mysql_database.name,
    privileges= ["SELECT", "UPDATE"],
    opts=pulumi.ResourceOptions(provider=mysql_provider))

# The database schema and initial data to be deployed to the database
creation_script = """
    CREATE TABLE votesTable (
        choice_id int(10) NOT NULL AUTO_INCREMENT,
        vote_count int(10) NOT NULL,
        PRIMARY KEY (choice_id)
    ) ENGINE=InnoDB;
    INSERT INTO votesTable(choice_id, vote_count) VALUES (0,0);
    INSERT INTO votesTable(choice_id, vote_count) VALUES (1,0);
    """

# The SQL commands the database performs when deleting the schema
deletion_script = "DROP TABLE votesTable CASCADE"

# Creating our dynamic resource to deploy the schema during `pulumi up`. The arguments
# are passed in as a SchemaInputs object
mysql_votes_table = Schema(name="mysql_votes_table",
    args=SchemaInputs(admin_name, admin_password, mysql_rds_server.address, mysql_database.name, creation_script, deletion_script))

# Exporting the ID of the dynamic resource we created
pulumi.export("dynamic-resource-id",mysql_votes_table.id)
