import json
import pulumi
from pulumi_aws import ec2, iam, redshift, s3, glue

# Import the stack's configuration settings.
config = pulumi.Config()
cluster_identifier = config.require("clusterIdentifier")
cluster_node_type = config.require("clusterNodeType")
cluster_db_name = config.require("clusterDBName")
cluster_db_username = config.require("clusterDBUsername")
cluster_db_password = config.require_secret("clusterDBPassword")
glue_db_name = config.require("glueDBName")

# Import the provider's configuration settings.
provider_config = pulumi.Config("aws")
aws_region = provider_config.require("region")

# Create an S3 bucket to store some raw data.
events_bucket = s3.Bucket(
    "events",
    s3.BucketArgs(
        force_destroy=True,
    ),
)

# Create a VPC.
vpc = ec2.Vpc(
    "vpc",
    ec2.VpcArgs(
        cidr_block="10.0.0.0/16",
        enable_dns_hostnames=True,
    ),
)

# Create a private subnet within the VPC.
subnet = ec2.Subnet(
    "subnet",
    ec2.SubnetArgs(
        vpc_id=vpc.id,
        cidr_block="10.0.1.0/24",
    ),
)

# Declare a Redshift subnet group with the subnet ID.
subnet_group = redshift.SubnetGroup(
    "subnet-group",
    redshift.SubnetGroupArgs(
        subnet_ids=[
            subnet.id,
        ],
    ),
)

# Create an IAM role granting Redshift read-only access to S3.
redshift_role = iam.Role(
    "redshift-role",
    iam.RoleArgs(
        assume_role_policy=json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Action": "sts:AssumeRole",
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "redshift.amazonaws.com",
                        },
                    },
                ],
            }
        ),
        managed_policy_arns=[
            iam.ManagedPolicy.AMAZON_S3_READ_ONLY_ACCESS,
        ],
    ),
)

# Create a VPC endpoint so the cluster can read from S3 over the private network.
vpc_endpoint = ec2.VpcEndpoint(
    "s3-vpc-endpoint",
    ec2.VpcEndpointArgs(
        vpc_id=vpc.id,
        service_name=f"com.amazonaws.{aws_region}.s3",
        route_table_ids=[
            vpc.main_route_table_id,
        ],
    ),
)

# Create a single-node Redshift cluster in the VPC.
cluster = redshift.Cluster(
    "cluster",
    redshift.ClusterArgs(
        cluster_identifier=cluster_identifier,
        database_name=cluster_db_name,
        master_username=cluster_db_username,
        master_password=cluster_db_password,
        node_type=cluster_node_type,
        cluster_subnet_group_name=subnet_group.name,
        cluster_type="single-node",
        publicly_accessible=False,
        skip_final_snapshot=True,
        vpc_security_group_ids=[
            vpc.default_security_group_id,
        ],
        iam_roles=[
            redshift_role.arn,
        ],
    ),
)

# Define an AWS cron expression of "every 15 minutes".
# https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html
every_15_minutes = "cron(0/15 * * * ? *)"

# Create a Glue catalog database.
glue_catalog_db = glue.CatalogDatabase(
    "glue-catalog-db",
    glue.CatalogDatabaseArgs(
        name=glue_db_name,
    ),
)

# Define an IAM role granting AWS Glue access to S3 and other Glue-required services.
glue_role = iam.Role(
    "glue-role",
    iam.RoleArgs(
        assume_role_policy=json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Action": "sts:AssumeRole",
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "glue.amazonaws.com",
                        },
                    },
                ],
            }
        ),
        managed_policy_arns=[
            iam.ManagedPolicy.AMAZON_S3_FULL_ACCESS,
            "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole",
        ],
    ),
)

# Create a Glue crawler to process the contents of the data bucket on a schedule.
# https://docs.aws.amazon.com/glue/latest/dg/monitor-data-warehouse-schedule.html
glue_crawler = glue.Crawler(
    "glue-crawler",
    glue.CrawlerArgs(
        database_name=glue_catalog_db.name,
        role=glue_role.arn,
        schedule=every_15_minutes,
        s3_targets=[
            glue.CrawlerS3TargetArgs(
                path=events_bucket.bucket.apply(lambda name: f"s3://{name}")
            ),
        ],
    ),
)

# Create a Glue connection to the Redshift cluster.
glue_redshift_connection = glue.Connection(
    "glue-redshift-connection",
    glue.ConnectionArgs(
        connection_type="JDBC",
        connection_properties={
            "JDBC_CONNECTION_URL": cluster.endpoint.apply(
                lambda endpoint: f"jdbc:redshift://{endpoint}/{cluster_db_name}"
            ),
            "USERNAME": cluster_db_username,
            "PASSWORD": cluster_db_password,
        },
        physical_connection_requirements=glue.ConnectionPhysicalConnectionRequirementsArgs(
            security_group_id_lists=cluster.vpc_security_group_ids,
            availability_zone=subnet.availability_zone,
            subnet_id=subnet.id,
        ),
    ),
)

# Create an S3 bucket for Glue scripts and temporary storage.
glue_job_bucket = s3.Bucket(
    "glue-job-bucket",
    s3.BucketArgs(
        force_destroy=True,
    ),
)

# Upload a Glue job script.
glue_job_script = s3.BucketObject(
    "glue-job.py",
    s3.BucketObjectArgs(
        bucket=glue_job_bucket.id,
        source=pulumi.asset.FileAsset("./glue-job.py"),
    ),
)

# Create a Glue job that runs our Python ETL script.
glue_job = glue.Job(
    "glue-job",
    glue.JobArgs(
        role_arn=glue_role.arn,
        glue_version="3.0",
        connections=[
            glue_redshift_connection.name,
        ],
        number_of_workers=10,
        worker_type="G.1X",
        default_arguments={
            # Enabling job bookmarks helps you avoid loading duplicate data.
            # https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html
            "--job-bookmark-option": "job-bookmark-enable",
            "--ConnectionName": glue_redshift_connection.name,
            "--GlueDBName": glue_db_name,
            "--GlueDBTableName": events_bucket.bucket.apply(
                lambda name: name.replace("-", "_")
            ),
            "--RedshiftDBName": cluster_db_name,
            "--RedshiftDBTableName": "events",
            "--RedshiftRoleARN": redshift_role.arn,
            "--TempDir": glue_job_bucket.bucket.apply(
                lambda name: f"s3://{name}/glue-job-temp"
            ),
        },
        command=glue.JobCommandArgs(
            script_location=glue_job_bucket.bucket.apply(
                lambda name: f"s3://{name}/glue-job.py"
            ),
            python_version="3",
        ),
    ),
)

# Create a Glue trigger to run the job every 15 minutes.
glue_job_trigger = glue.Trigger(
    "trigger",
    glue.TriggerArgs(
        schedule=every_15_minutes,
        type="SCHEDULED",
        actions=[
            glue.TriggerActionArgs(
                job_name=glue_job.name,
            ),
        ],
    ),
)

# Export the name of the data bucket.
pulumi.export("dataBucketName", events_bucket.bucket)
