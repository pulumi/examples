// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

export interface LandingZoneArgs {
    /** VPC CIDR block. Defaults to 10.0.0.0/16. */
    cidrBlock?: string;
    /** Number of availability zones to spread the VPC across. Defaults to 3. */
    numberOfAvailabilityZones?: number;
    /** Principal allowed to assume the deployer and read-only roles. Defaults to the account root. */
    trustedPrincipalArn?: pulumi.Input<string>;
    /** Retention (in days) for audit logs and the flow-log group. Defaults to 90. */
    auditRetentionDays?: number;
    /** Tags applied to every resource that supports them. */
    tags?: Record<string, string>;
}

/**
 * LandingZone provisions the foundational, shared resources a single AWS account
 * needs before workloads land on top of it: a three-AZ VPC with public and
 * private subnets, a KMS key, VPC flow logs, deployer and read-only IAM roles,
 * and an encrypted CloudTrail audit trail. Downstream Pulumi projects consume its
 * outputs (via a StackReference) rather than re-creating this plumbing.
 *
 * This is an illustrative starting point, not a production-ready landing zone;
 * see the README for the guardrails a real one would add.
 */
export class LandingZone {
    public readonly networkId: pulumi.Output<string>;
    public readonly publicSubnetIds: pulumi.Output<string[]>;
    public readonly privateSubnetIds: pulumi.Output<string[]>;
    public readonly dataEncryptionKeyArn: pulumi.Output<string>;
    public readonly dataEncryptionKeyAlias: pulumi.Output<string>;
    public readonly secretsStore: pulumi.Output<string>;
    public readonly deployerRoleArn: pulumi.Output<string>;
    public readonly readOnlyRoleArn: pulumi.Output<string>;
    public readonly auditBucket: pulumi.Output<string>;

    constructor(name: string, args: LandingZoneArgs = {}) {
        const tags = { ...args.tags, "landing-zone": name };
        const cidrBlock = args.cidrBlock ?? "10.0.0.0/16";
        const retentionDays = args.auditRetentionDays ?? 90;

        // --- Network -------------------------------------------------------

        // awsx.ec2.Vpc builds the whole network topology from one component:
        // public and private subnets across each AZ, an internet gateway, one NAT
        // gateway per AZ, and the associated route tables. Spreading across three
        // AZs gives the workloads that land here room to run highly available.
        const vpc = new awsx.ec2.Vpc(`${name}-vpc`, {
            cidrBlock,
            numberOfAvailabilityZones: args.numberOfAvailabilityZones ?? 3,
            natGateways: { strategy: "OnePerAz" },
            tags,
        });

        // --- Encryption ----------------------------------------------------

        const callerIdentity = aws.getCallerIdentity({});
        const accountId = pulumi.output(callerIdentity).accountId;
        const region = aws.getRegionOutput().name;

        // The CMK encrypts the flow-log group, the CloudTrail trail, and the audit
        // bucket, so its key policy must let those service principals use it - the
        // default key policy (account root only) is not enough.
        const keyPolicy = pulumi.all([accountId, region]).apply(([account, reg]) => JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "EnableRootAccount",
                    Effect: "Allow",
                    Principal: { AWS: `arn:aws:iam::${account}:root` },
                    Action: "kms:*",
                    Resource: "*",
                },
                {
                    Sid: "AllowCloudWatchLogs",
                    Effect: "Allow",
                    Principal: { Service: `logs.${reg}.amazonaws.com` },
                    Action: ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:DescribeKey"],
                    Resource: "*",
                    Condition: {
                        ArnLike: {
                            "kms:EncryptionContext:aws:logs:arn": `arn:aws:logs:${reg}:${account}:log-group:*`,
                        },
                    },
                },
                {
                    Sid: "AllowCloudTrailEncrypt",
                    Effect: "Allow",
                    Principal: { Service: "cloudtrail.amazonaws.com" },
                    Action: ["kms:GenerateDataKey*", "kms:DescribeKey"],
                    Resource: "*",
                    Condition: {
                        StringLike: {
                            "kms:EncryptionContext:aws:cloudtrail:arn": `arn:aws:cloudtrail:*:${account}:trail/*`,
                        },
                    },
                },
            ],
        }));

        const key = new aws.kms.Key(`${name}-key`, {
            description: `${name} landing zone master key`,
            enableKeyRotation: true,
            policy: keyPolicy,
            tags,
        });
        const keyAlias = new aws.kms.Alias(`${name}-key-alias`, {
            name: `alias/${name}-landing-zone`,
            targetKeyId: key.keyId,
        });

        // --- VPC flow logs -------------------------------------------------

        const flowLogsGroup = new aws.cloudwatch.LogGroup(`${name}-flow-logs`, {
            retentionInDays: retentionDays,
            kmsKeyId: key.arn,
            tags,
        });
        const flowLogsRole = new aws.iam.Role(`${name}-flow-logs-role`, {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: { Service: "vpc-flow-logs.amazonaws.com" },
                    Action: "sts:AssumeRole",
                }],
            }),
            tags,
        });
        new aws.iam.RolePolicy(`${name}-flow-logs-policy`, {
            role: flowLogsRole.id,
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: [
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                        "logs:DescribeLogGroups",
                        "logs:DescribeLogStreams",
                    ],
                    Resource: "*",
                }],
            }),
        });
        new aws.ec2.FlowLog(`${name}-flow-log`, {
            vpcId: vpc.vpcId,
            iamRoleArn: flowLogsRole.arn,
            logDestination: flowLogsGroup.arn,
            trafficType: "ALL",
            tags,
        });

        // --- Workload identities -------------------------------------------

        const trustedArn = pulumi.output(
            args.trustedPrincipalArn ?? accountId.apply((id) => `arn:aws:iam::${id}:root`),
        );

        const assumeRolePolicy = trustedArn.apply((arn) => JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Principal: { AWS: arn },
                Action: "sts:AssumeRole",
            }],
        }));

        const deployerRole = new aws.iam.Role(`${name}-deployer`, {
            name: `${name}-deployer`,
            assumeRolePolicy,
            description: "Workload deployer for projects rooted at this landing zone.",
            tags,
        });
        new aws.iam.RolePolicyAttachment(`${name}-deployer-attach`, {
            role: deployerRole.name,
            policyArn: "arn:aws:iam::aws:policy/PowerUserAccess",
        });

        const readOnlyRole = new aws.iam.Role(`${name}-readonly`, {
            name: `${name}-readonly`,
            assumeRolePolicy,
            description: "Read-only observability role for projects rooted at this landing zone.",
            tags,
        });
        new aws.iam.RolePolicyAttachment(`${name}-readonly-attach`, {
            role: readOnlyRole.name,
            policyArn: "arn:aws:iam::aws:policy/ReadOnlyAccess",
        });

        // --- Audit logging (CloudTrail) ------------------------------------

        const auditBucket = new aws.s3.BucketV2(`${name}-audit`, {
            forceDestroy: true,
            tags,
        });
        new aws.s3.BucketServerSideEncryptionConfigurationV2(`${name}-audit-sse`, {
            bucket: auditBucket.id,
            rules: [{
                applyServerSideEncryptionByDefault: {
                    sseAlgorithm: "aws:kms",
                    kmsMasterKeyId: key.arn,
                },
            }],
        });
        new aws.s3.BucketLifecycleConfigurationV2(`${name}-audit-lifecycle`, {
            bucket: auditBucket.id,
            rules: [{
                id: "retain",
                status: "Enabled",
                expiration: { days: retentionDays },
            }],
        });

        // CloudTrail validates on creation that it can write to the bucket, so the
        // bucket policy granting the CloudTrail service principal access must exist
        // before the trail is created.
        const trailArn = pulumi.interpolate`arn:aws:cloudtrail:${region}:${accountId}:trail/${name}-trail`;
        const auditBucketPolicy = new aws.s3.BucketPolicy(`${name}-audit-policy`, {
            bucket: auditBucket.id,
            policy: pulumi.all([auditBucket.arn, trailArn]).apply(([bucketArn, trail]) => JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Sid: "AWSCloudTrailAclCheck",
                        Effect: "Allow",
                        Principal: { Service: "cloudtrail.amazonaws.com" },
                        Action: "s3:GetBucketAcl",
                        Resource: bucketArn,
                        Condition: { StringEquals: { "aws:SourceArn": trail } },
                    },
                    {
                        Sid: "AWSCloudTrailWrite",
                        Effect: "Allow",
                        Principal: { Service: "cloudtrail.amazonaws.com" },
                        Action: "s3:PutObject",
                        Resource: `${bucketArn}/AWSLogs/*`,
                        Condition: {
                            StringEquals: {
                                "s3:x-amz-acl": "bucket-owner-full-control",
                                "aws:SourceArn": trail,
                            },
                        },
                    },
                ],
            })),
        });

        new aws.cloudtrail.Trail(`${name}-trail`, {
            name: `${name}-trail`,
            s3BucketName: auditBucket.id,
            includeGlobalServiceEvents: true,
            isMultiRegionTrail: true,
            enableLogFileValidation: true,
            kmsKeyId: key.arn,
            tags,
        }, { dependsOn: [auditBucketPolicy] });

        // --- Outputs -------------------------------------------------------

        this.networkId = vpc.vpcId;
        this.publicSubnetIds = vpc.publicSubnetIds;
        this.privateSubnetIds = vpc.privateSubnetIds;
        this.dataEncryptionKeyArn = key.arn;
        this.dataEncryptionKeyAlias = keyAlias.name;
        this.secretsStore = pulumi.interpolate`${name}/`;
        this.deployerRoleArn = deployerRole.arn;
        this.readOnlyRoleArn = readOnlyRole.arn;
        this.auditBucket = auditBucket.bucket;
    }
}
