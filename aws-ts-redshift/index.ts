import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const availabilityZone = config.require("availabilityZone")
const clusterIdentifier = config.require("clusterIdentifier");
const databaseName = config.require("dbName");
const masterUsername = config.require("dbUsername");
const masterPassword = config.requireSecret("dbPassword");
const nodeType = config.require("nodeType");

// Create a new VPC.
const vpc = new aws.ec2.Vpc("vpc", {
    cidrBlock: "10.1.0.0/16",
});

// Create an internet gateway.
const gateway = new aws.ec2.InternetGateway("gateway", {
    vpcId: vpc.id,
});

// Create a VPC subnet.
const subnet = new aws.ec2.Subnet("subnet", {
    availabilityZone,
    cidrBlock: "10.1.1.0/24",
    vpcId: vpc.id,
});

// Create a Redshift subnet group for the cluster.
const subnetGroup = new aws.redshift.SubnetGroup("subnet-group", {
    subnetIds: [
        subnet.id,
    ],
});

// Create an S3 bucket.
const bucket = new aws.s3.Bucket("bucket");

// Create an IAM role granting the cluster read access S3.
const iamRole = new aws.iam.Role("pulumi-iam-role", {
    assumeRolePolicy: JSON.stringify({
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
    }),
    inlinePolicies: [
        {
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: [
                            "s3:Get*", "s3:List*",
                        ],
                        Effect: "Allow",
                        Resource: "*",
                    },
                ],
            }),
        },
    ],
});

// Create the Redshift cluster.
const cluster = new aws.redshift.Cluster("cluster", {
    clusterIdentifier,
    databaseName,
    masterUsername,
    masterPassword,
    nodeType,
    clusterType: "single-node",
    clusterSubnetGroupName: subnetGroup.name,
    skipFinalSnapshot: true,
    iamRoles: [
        iamRole.arn,
    ],
});

// Export the cluster endpoint.
export const { endpoint } = cluster;
