import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { ComponentResource, ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";

export interface ApplicationArgs {
    description: string;
    baseTags: aws.Tags;

    vpcId: Input<string>;

    albSubnetIds: Input<Input<string>[]>;

    dbHost: Input<string>;
    dbPassword: Input<string>;
    dbUsername: Input<string>;
    dbPort: Input<string>;
    dbName: Input<string>;

    /**
     * Pre-existing security group(s) to use for the ALB.
     * If not specified one will be created.
     */
    albSecurityGroupIds?: Input<string>[];

    appSubnetIds: Input<Input<string>[]>;
    /**
     * Used to create security groups for the ALB.
     */
    appPort: Input<number>;

    /**
     * Pre-existing security group(s) to use for the FargateService.
     * If not specified one will be created.
     */
    appSecurityGroupIds?: Input<string>[];

    appImage: Input<string>;
    appResources?: ApplicationResources;
}

export interface ApplicationResources {
    desiredCount?: Input<number>;
    cpu?: Input<number>;
    memory?: Input<number>;
}

export class Application extends ComponentResource {
    applicationLoadBalancer: awsx.lb.ApplicationLoadBalancer;
    applicationListener: aws.lb.Listener;
    cluster: aws.ecs.Cluster;
    fargateService: awsx.ecs.FargateService;

    /**
     * Returns the DNS Name of the ALB.
     */
    public albAddress(): Output<string> {
        return this.applicationLoadBalancer.loadBalancer.dnsName;
    }

    constructor(name: string, args: ApplicationArgs, opts?: ComponentResourceOptions) {
        super("application", name, {}, opts);

        const vpc = aws.ec2.Vpc.get(`${name}-service-vpc`, args.vpcId, {}, { parent: this });

        // Use the provided pre-existing security group or create a new one.
        const albSecGroup = args.albSecurityGroupIds || [
            new aws.ec2.SecurityGroup(`${name}-service-alb-sg`, {
                vpcId: vpc.id,
            }, { parent: vpc }).id,
        ];

        this.applicationLoadBalancer = new awsx.lb.ApplicationLoadBalancer(`${name}-service-alb`, {
            subnetIds: args.albSubnetIds,
            securityGroups: albSecGroup,
            tags: {
                ...args.baseTags,
                Name: `${args.description} ALB`,
            },
        }, { parent: this });

        const targetGroup = new aws.lb.TargetGroup(`${name}-service-tg`, {
            port: args.appPort,
            protocol: "HTTP",
            targetType: "ip",
            vpcId: vpc.id,
        }, { parent: this });

        this.applicationListener = new aws.lb.Listener(`${name}-service-alb-listener`, {
            loadBalancerArn: this.applicationLoadBalancer.loadBalancer.arn,
            port: args.appPort,
            defaultActions: [{
                type: "forward",
                targetGroupArn: targetGroup.arn,
            }],
        }, { parent: this.applicationLoadBalancer });

        this.cluster = new aws.ecs.Cluster(`${name}-cluster`, {
            tags: {
                ...args.baseTags,
                Name: `${args.description} Cluster`,
            },
        }, { parent: this });

        // Use the provided pre-existing security group or create a new one.
        const appSecGroup = args.appSecurityGroupIds || [
            new aws.ec2.SecurityGroup(`${name}-service-sg`, {
                vpcId: vpc.id,
                ingress: [
                    {
                        fromPort: args.appPort,
                        toPort: args.appPort,
                        protocol: "tcp",
                        cidrBlocks: ["0.0.0.0/0"],
                    },
                ],
                egress: [{ fromPort: 0, toPort: 0, protocol: "-1", cidrBlocks: ["0.0.0.0/0"] }],
            }, { parent: vpc }).id,
        ];

        this.fargateService = new awsx.ecs.FargateService(`${name}-service`, {
            cluster: this.cluster.arn,
            assignPublicIp: false,
            networkConfiguration: {
                subnets: args.appSubnetIds,
                securityGroups: appSecGroup,
            },
            desiredCount: (args.appResources || {}).desiredCount,
            taskDefinitionArgs: {
                container: {
                    name: name,
                    ...args.appResources, // cpu, memory, etc.
                    image: args.appImage,
                    portMappings: [{ containerPort: args.appPort, targetGroup: targetGroup }],
                    environment: [
                        {
                            name: "DB_HOST",
                            value: args.dbHost,
                        },
                        {
                            name: "DB_USERNAME",
                            value: args.dbUsername,
                        },
                        {
                            name: "DB_PASSWORD",
                            value: args.dbPassword,
                        },
                        {
                            name: "DB_PORT",
                            value: args.dbPort,
                        },
                        {
                            name: "DB_NAME",
                            value: args.dbName,
                        },
                    ],
                },
            },
        }, { parent: this.cluster });

        this.registerOutputs({});
    }
}
