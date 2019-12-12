import * as aws from "@pulumi/aws";
import { ComponentResource, ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";

export interface RdsArgs {
    description: Input<string>;
    baseTags: aws.Tags;

    subnetIds: Input<Input<string>[]>;

    password: Input<string>;
    username: Input<string>;
    allocatedStorage: Input<number>;
    engineVersion: Input<string>;
    instanceClass: Input<string>;
    storageType: Input<string>;
    securityGroupIds: Input<string>[];
    initalDbName: Input<string>;

    /**
     * Defaults to `false`.
     */
    sendEnhancedLogsToCloudwatch?: Input<boolean>;
    /**
     * Defaults to `7` days.
     */
    backupRetentionPeriod?: Input<number>;
    /**
     * Defaults to `00:00-01:00`.
     */
    backupWindow?: Input<string>;
    /**
     * Defaults to `""` so to disable.
     */
    finalSnapshotIdentifier?: Input<string>;
    /**
     * Default is `false`.
     */
    skipFinalSnapshot?: Input<boolean>;
    /**
     * Defaults to `0`.
     */
    iops?: Input<number>;
    /**
     * * Defaults to `Mon:00:00-Mon:03:00`
     */
    maintenanceWindow?: Input<string>;
    /**
     * Defaults to `0`.
     */
    monitoringInterval?: Input<number>;
    optionGroupName?: Input<string>;
    parameterGroupName?: Input<string>;
}

export class RdsInstance extends ComponentResource {
    db: aws.rds.Instance;
    subnetGroup: aws.rds.SubnetGroup;
    enhancedMonitoringRole: aws.iam.Role;

    private name: string;
    private baseTags: aws.Tags;

    public instanceEndpoint(): Output<string> {
        return this.db.endpoint;
    }

    public instancePort(): Output<string> {
        return this.db.port.apply(x => String(x));
    }

    public instanceAddress(): Output<string> {
        return this.db.address;
    }

    constructor(name: string, args: RdsArgs, opts?: ComponentResourceOptions) {
        super("db", name, {}, opts);

        this.name = name;
        this.baseTags = args.baseTags;

        if (args.sendEnhancedLogsToCloudwatch) {
            this.enhancedMonitoringRole = new aws.iam.Role(`${name}-enhanced-monitoring-role`, {
                assumeRolePolicy: {
                    Version: "2012-10-17",
                    Statement: [{
                        Action: "sts:AssumeRole",
                        Principal: {
                            Service: "monitoring.rds.amazonaws.com",
                        },
                        Effect: "Allow",
                        Sid: "",
                    }],
                },
                tags: {
                    ...args.baseTags,
                    Name: `${args.description} Enhanced Monitoring Role`,
                },
            }, { parent: this });

            new aws.iam.RolePolicyAttachment(`enhanced-policy-attachment`, {
                role: this.enhancedMonitoringRole.name,
                policyArn: "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole",
            }, { parent: this });
        }

        this.subnetGroup = new aws.rds.SubnetGroup(`${name}-subnet-group`, {
            subnetIds: args.subnetIds,
            tags: {
                ...args.baseTags,
                Name: `${args.description} Subnet Group`,
            },
        }, { parent: this });

        this.db = new aws.rds.Instance(`${name}-rds`, {
            allocatedStorage: args.allocatedStorage,
            dbSubnetGroupName: this.subnetGroup.name,
            engine: "postgres",
            engineVersion: args.engineVersion,
            instanceClass: args.instanceClass,
            iops: args.iops || 0,
            backupRetentionPeriod: args.backupRetentionPeriod || 7,
            backupWindow: args.backupWindow || "00:00-01:00",
            maintenanceWindow: args.maintenanceWindow || "Mon:02:00-Mon:04:00",
            monitoringInterval: args.monitoringInterval || 0,
            monitoringRoleArn: this.enhancedMonitoringRole.arn || "",
            optionGroupName: args.optionGroupName || "",
            parameterGroupName: args.parameterGroupName || "",
            password: args.password,
            username: args.username,
            name: args.initalDbName,
            storageType: args.storageType,
            finalSnapshotIdentifier: args.finalSnapshotIdentifier || "",
            skipFinalSnapshot: args.skipFinalSnapshot || false,
            vpcSecurityGroupIds: args.securityGroupIds || [],
            tags: {
                ...args.baseTags,
                Name: `${args.description} DB Instance`,
            },
        }, { parent: this });
    }
}
