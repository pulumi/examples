// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Import the stack's configuration settings.
const config = new pulumi.Config();
const clusterIdentifier = config.require("clusterIdentifier");
const clusterNodeType = config.require("clusterNodeType");
const clusterDBName = config.require("clusterDBName");
const clusterDBUsername = config.require("clusterDBUsername");
const clusterDBPassword = config.requireSecret("clusterDBPassword");
const glueDBName = config.require("glueDBName");

// Import the provider's configuration settings.
const providerConfig = new pulumi.Config("aws");
const awsRegion = providerConfig.require("region");

// Create an S3 bucket to store some raw data.
const eventsBucket = new aws.s3.Bucket("events", {
    forceDestroy: true,
});

// Create a VPC.
const vpc = new aws.ec2.Vpc("vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
});

// Create a private subnet within the VPC.
const subnet = new aws.ec2.Subnet("subnet", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
});

// Declare a Redshift subnet group with the subnet ID.
const subnetGroup = new aws.redshift.SubnetGroup("subnet-group", {
    subnetIds: [
        subnet.id,
    ],
});

// Create an IAM role granting Redshift read-only access to S3.
const redshiftRole = new aws.iam.Role("redshift-role", {
    assumeRolePolicy: {
        Version: "2012-10-17",
        Statement: [
            {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: {
                    Service: "redshift.amazonaws.com",
                },
            },
        ],
    },
    managedPolicyArns: [
        aws.iam.ManagedPolicy.AmazonS3ReadOnlyAccess,
    ],
});

// Create a VPC endpoint so the cluster can read from S3 over the private network.
const vpcEndpoint = new aws.ec2.VpcEndpoint("s3-vpc-endpoint", {
    vpcId: vpc.id,
    serviceName: `com.amazonaws.${awsRegion}.s3`,
    routeTableIds: [
        vpc.mainRouteTableId,
    ],
});

// Create a single-node Redshift cluster in the VPC.
const cluster = new aws.redshift.Cluster("cluster", {
    clusterIdentifier: clusterIdentifier,
    databaseName: clusterDBName,
    masterUsername: clusterDBUsername,
    masterPassword: clusterDBPassword,
    nodeType: clusterNodeType,
    clusterSubnetGroupName: subnetGroup.name,
    clusterType: "single-node",
    publiclyAccessible: false,
    skipFinalSnapshot: true,
    vpcSecurityGroupIds: [
        vpc.defaultSecurityGroupId,
    ],
    iamRoles: [
        redshiftRole.arn,
    ],
});

// Define an AWS cron expression of "every 15 minutes".
// https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html
const every15minutes = "cron(0/15 * * * ? *)";

// Create a Glue catalog database.
const glueCatalogDB = new aws.glue.CatalogDatabase("glue-catalog-db", {
    name: glueDBName,
});

// Define an IAM role granting AWS Glue access to S3 and other Glue-required services.
const glueRole = new aws.iam.Role("glue-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: {
                    Service: "glue.amazonaws.com",
                },
            },
        ],
    }),
    managedPolicyArns: [
        aws.iam.ManagedPolicy.AmazonS3FullAccess,
        "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole",
    ],
});

// Create a Glue crawler to process the contents of the data bucket on a schedule.
// https://docs.aws.amazon.com/glue/latest/dg/monitor-data-warehouse-schedule.html
const glueCrawler = new aws.glue.Crawler("glue-crawler", {
    databaseName: glueCatalogDB.name,
    role: glueRole.arn,
    schedule: every15minutes,
    s3Targets: [
        {
            path: pulumi.interpolate`s3://${eventsBucket.bucket}`,
        },
    ],
});

// Create a Glue connection to the Redshift cluster.
const glueRedshiftConnection = new aws.glue.Connection("glue-redshift-connection", {
    connectionType: "JDBC",
    connectionProperties: {
        JDBC_CONNECTION_URL: pulumi.interpolate`jdbc:redshift://${cluster.endpoint}/${clusterDBName}`,
        USERNAME: clusterDBUsername,
        PASSWORD: clusterDBPassword,
    },
    physicalConnectionRequirements: {
        securityGroupIdLists: cluster.vpcSecurityGroupIds,
        availabilityZone: subnet.availabilityZone,
        subnetId: subnet.id,
    },
});

// Create an S3 bucket for Glue scripts and temporary storage.
const glueJobBucket = new aws.s3.Bucket("glue-job-bucket", {
    forceDestroy: true,
});

// Upload a Glue job script.
const glueJobScript = new aws.s3.BucketObject("glue-job.py", {
    bucket: glueJobBucket.id,
    source: new pulumi.asset.FileAsset("./glue-job.py"),
});

// Create a Glue job that runs our Python ETL script.
const glueJob = new aws.glue.Job("glue-job", {
    roleArn: glueRole.arn,
    glueVersion: "3.0",
    numberOfWorkers: 10,
    workerType: "G.1X",
    defaultArguments: {
        // Enabling job bookmarks helps you avoid loading duplicate data.
        // https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html
        "--job-bookmark-option": "job-bookmark-enable",

        "--ConnectionName": glueRedshiftConnection.name,
        "--GlueDBName": glueDBName,
        "--GlueDBTableName": eventsBucket.bucket.apply(name => name.replace("-", "_")),
        "--RedshiftDBName": clusterDBName,
        "--RedshiftDBTableName": "events",
        "--RedshiftRoleARN": redshiftRole.arn,
        "--TempDir": pulumi.interpolate`s3://${glueJobBucket.bucket}/glue-job-temp`,
    },
    connections: [
        glueRedshiftConnection.name,
    ],
    command: {
        scriptLocation: pulumi.interpolate`s3://${glueJobBucket.bucket}/glue-job.py`,
        pythonVersion: "3",
    },
});

// Create a Glue trigger to run the job every 15 minutes.
const glueJobTrigger = new aws.glue.Trigger("trigger", {
    schedule: every15minutes,
    type: "SCHEDULED",
    actions: [{
        jobName: glueJob.name,
    }],
});

// Export the name of the data bucket.
export const dataBucketName = eventsBucket.bucket;
