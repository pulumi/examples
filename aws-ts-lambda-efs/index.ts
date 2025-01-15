// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as time from "@pulumiverse/time";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as cp from "child_process";
import * as fs from "fs";

export = async () => {

    // VPC
    const vpc = new awsx.ec2.Vpc("vpc", {
        subnetStrategy: "Auto",
        enableDnsHostnames: true,
        enableDnsSupport: true,
    });
    const subnetIds = await vpc.publicSubnetIds;

    const securityGroup = new aws.ec2.SecurityGroup("group", {
        vpcId: vpc.vpcId,
        ingress: [
            {
                fromPort: 443,
                toPort: 443,
                protocol: "tcp",
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
        egress: [
            {
                fromPort: 0,
                toPort: 0,
                protocol: "-1",
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
    });

    // EFS
    const filesystem = new aws.efs.FileSystem("filesystem");

    const targets: pulumi.Output<aws.efs.MountTarget[]> = subnetIds.apply(ids => {
        const targetArray: aws.efs.MountTarget[] = [];
        for (let i = 0; i < ids.length; i++) {
            targetArray.push(new aws.efs.MountTarget(`fs-mount-${i}`, {
                fileSystemId: filesystem.id,
                subnetId: subnetIds[i],
                securityGroups: [securityGroup.id],
            }));
        }
        return targetArray;
    });

    const ap = new aws.efs.AccessPoint("ap", {
        fileSystemId: filesystem.id,
        posixUser: { uid: 1000, gid: 1000 },
        rootDirectory: { path: "/www", creationInfo: { ownerGid: 1000, ownerUid: 1000, permissions: "755" } },
    }, { dependsOn: targets });

    // Add a 60-second delay to compensate for an eventual-consistency issue.
    // See https://github.com/hashicorp/terraform-provider-aws/issues/29828 for details.
    // This can be removed when the issue above is resolved.
    const delay = new time.Sleep("delay", {
        createDuration: "60s"},
    { dependsOn: targets });

    const lambdaRole = new aws.iam.Role("lambda-role", {
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Action: "sts:AssumeRole",
                Principal: {
                    Service: "lambda.amazonaws.com",
                },
                Effect: "Allow",
            }],
        }),
        managedPolicyArns: [
            aws.iam.ManagedPolicy.AWSLambdaVPCAccessExecutionRole,
            aws.iam.ManagedPolicy.LambdaFullAccess,
        ],
    });

    // Lambda
    function efsvpcCallback(name: string, f: aws.lambda.Callback<APIGatewayProxyEvent, APIGatewayProxyResult>) {
        return new aws.lambda.CallbackFunction(name, {
            role: lambdaRole,

            vpcConfig: {
                subnetIds: vpc.privateSubnetIds,
                securityGroupIds: [securityGroup.id],
            },
            fileSystemConfig: { arn: ap.arn, localMountPath: "/mnt/storage" },
            callback: f,
        }, { dependsOn: [ delay ]});
    }

    // API Gateway
    const api = new apigateway.RestAPI("api", {
        routes: [
            {
                method: "GET", path: "/files/{filename+}", eventHandler: efsvpcCallback("getHandler", async (ev, ctx) => {
                    try {
                        const f = "/mnt/storage/" + ev.pathParameters!.filename;
                        const data = fs.readFileSync(f);
                        return {
                            statusCode: 200,
                            body: data.toString(),
                        };
                    } catch {
                        return { statusCode: 500, body: "" };
                    }
                }),
            },
            {
                method: "POST", path: "/files/{filename+}", eventHandler: efsvpcCallback("uploadHandler", async (ev, ctx) => {
                    try {
                        const f = "/mnt/storage/" + ev.pathParameters!.filename;
                        const data = Buffer.from(ev.body!, "base64");
                        fs.writeFileSync(f, data);
                        return {
                            statusCode: 200,
                            body: "",
                        };
                    } catch {
                        return { statusCode: 500, body: "" };
                    }
                }),
            },
            {
                method: "POST", path: "/", eventHandler: efsvpcCallback("execHandler", async (ev, ctx) => {
                    const cmd = Buffer.from(ev.body!, "base64").toString();
                    const buf = cp.execSync(cmd);
                    return {
                        statusCode: 200,
                        body: buf.toString(),
                    };
                }),
            },
        ],
    });

    // ECS Cluster
    const cluster = new aws.ecs.Cluster("cluster");

    const efsVolume: aws.types.input.ecs.TaskDefinitionVolume = {
        name: "efs",
        efsVolumeConfiguration: {
            fileSystemId: filesystem.id,
            authorizationConfig: { accessPointId: ap.id },
            transitEncryption: "ENABLED",
        },
    };

    // Fargate Service
    const nginx = new awsx.ecs.FargateService("nginx", {
        cluster: cluster.arn,
        taskDefinitionArgs: {
            container: {
                image: "nginx",
                name: "nginx",
                memory: 128,
                portMappings: [{ containerPort: 80, hostPort: 80, protocol: "tcp" }],
                mountPoints: [{ containerPath: "/usr/share/nginx/html", sourceVolume: efsVolume.name }],
            },
            volumes: [efsVolume],
        },
        platformVersion: "1.4.0",
        networkConfiguration: {
            securityGroups: [securityGroup.id],
            subnets: vpc.publicSubnetIds,
            assignPublicIp: true,
        },
    });

    // Exports
    return {
        url: api.url,
    };
};
