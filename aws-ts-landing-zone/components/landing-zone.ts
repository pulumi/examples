// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface LandingZoneArgs {
    /** VPC CIDR block. Defaults to 10.0.0.0/16. */
    cidrBlock?: string;
    /** Availability zones to spread subnets across. Defaults to the first two available. */
    availabilityZones?: pulumi.Input<string[]>;
    /** Principal allowed to assume the deployer and read-only roles. Defaults to the account root. */
    trustedPrincipalArn?: pulumi.Input<string>;
    /** Retention (in days) for audit logs and the flow-log group. Defaults to 90. */
    auditRetentionDays?: number;
    /** Tags applied to every resource that supports them. */
    tags?: Record<string, string>;
}

/**
 * LandingZone provisions the foundational, shared resources a single AWS account
 * needs before workloads land on top of it: a two-AZ VPC with public and private
 * subnets, a KMS key, VPC flow logs, deployer and read-only IAM roles, and an
 * encrypted CloudTrail audit trail. Downstream Pulumi projects consume its
 * outputs (via a StackReference) rather than re-creating this plumbing.
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

        const azs = pulumi.output(
            args.availabilityZones ??
                aws.getAvailabilityZones({ state: "available" }).then((z) => z.names.slice(0, 2)),
        );

        // --- Network -------------------------------------------------------

        const vpc = new aws.ec2.Vpc(`${name}-vpc`, {
            cidrBlock,
            enableDnsHostnames: true,
            enableDnsSupport: true,
            tags,
        });

        const igw = new aws.ec2.InternetGateway(`${name}-igw`, {
            vpcId: vpc.id,
            tags,
        });

        const publicSubnets: aws.ec2.Subnet[] = [];
        const privateSubnets: aws.ec2.Subnet[] = [];
        const natGateways: aws.ec2.NatGateway[] = [];

        for (let i = 0; i < 2; i++) {
            const az = azs.apply((names) => names[i]);
            const publicSubnet = new aws.ec2.Subnet(`${name}-public-${i}`, {
                vpcId: vpc.id,
                availabilityZone: az,
                cidrBlock: pulumi.interpolate`10.0.${i * 16}.0/20`,
                mapPublicIpOnLaunch: true,
                tags: { ...tags, tier: "public" },
            });
            publicSubnets.push(publicSubnet);

            const eip = new aws.ec2.Eip(`${name}-nat-eip-${i}`, { domain: "vpc", tags });
            const nat = new aws.ec2.NatGateway(`${name}-nat-${i}`, {
                allocationId: eip.id,
                subnetId: publicSubnet.id,
                tags,
            }, { dependsOn: [igw] });
            natGateways.push(nat);

            const privateSubnet = new aws.ec2.Subnet(`${name}-private-${i}`, {
                vpcId: vpc.id,
                availabilityZone: az,
                cidrBlock: pulumi.interpolate`10.0.${i * 16 + 128}.0/20`,
                tags: { ...tags, tier: "private" },
            });
            privateSubnets.push(privateSubnet);
        }

        const publicRt = new aws.ec2.RouteTable(`${name}-public-rt`, {
            vpcId: vpc.id,
            routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: igw.id }],
            tags,
        });
        publicSubnets.forEach((subnet, i) =>
            new aws.ec2.RouteTableAssociation(`${name}-public-rta-${i}`, {
                subnetId: subnet.id,
                routeTableId: publicRt.id,
            }),
        );
        privateSubnets.forEach((subnet, i) => {
            const rt = new aws.ec2.RouteTable(`${name}-private-rt-${i}`, {
                vpcId: vpc.id,
                routes: [{ cidrBlock: "0.0.0.0/0", natGatewayId: natGateways[i].id }],
                tags,
            });
            new aws.ec2.RouteTableAssociation(`${name}-private-rta-${i}`, {
                subnetId: subnet.id,
                routeTableId: rt.id,
            });
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
            vpcId: vpc.id,
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

        this.networkId = vpc.id;
        this.publicSubnetIds = pulumi.output(publicSubnets.map((s) => s.id));
        this.privateSubnetIds = pulumi.output(privateSubnets.map((s) => s.id));
        this.dataEncryptionKeyArn = key.arn;
        this.dataEncryptionKeyAlias = keyAlias.name;
        this.secretsStore = pulumi.interpolate`${name}/`;
        this.deployerRoleArn = deployerRole.arn;
        this.readOnlyRoleArn = readOnlyRole.arn;
        this.auditBucket = auditBucket.bucket;
    }
}
