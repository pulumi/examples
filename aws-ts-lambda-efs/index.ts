// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as cp from "child_process";
import * as fs from "fs";

export = async () => {

    // VPC
    const vpc = new awsx.ec2.Vpc("vpc", { subnets: [{ type: "private" }, { type: "public" }] });
    const subnetIds = await vpc.publicSubnetIds;

    // EFS
    const filesystem = new aws.efs.FileSystem("filesystem");
    const targets = [];
    for (let i = 0; i < subnetIds.length; i++) {
        targets.push(new aws.efs.MountTarget(`fs-mount-${i}`, {
            fileSystemId: filesystem.id,
            subnetId: subnetIds[i],
            securityGroups: [vpc.vpc.defaultSecurityGroupId],
        }));
    }
    const ap = new aws.efs.AccessPoint("ap", {
        fileSystemId: filesystem.id,
        posixUser: { uid: 1000, gid: 1000 },
        rootDirectory: { path: "/www", creationInfo: { ownerGid: 1000, ownerUid: 1000, permissions: "755" } },
    }, { dependsOn: targets });

    // Lambda
    function efsvpcCallback(name: string, f: aws.lambda.Callback<awsx.apigateway.Request, awsx.apigateway.Response>) {
        return new aws.lambda.CallbackFunction(name, {
            policies: [aws.iam.ManagedPolicy.AWSLambdaVPCAccessExecutionRole, aws.iam.ManagedPolicy.LambdaFullAccess],
            vpcConfig: {
                subnetIds: vpc.privateSubnetIds,
                securityGroupIds: [vpc.vpc.defaultSecurityGroupId],
            },
            fileSystemConfig: { arn: ap.arn, localMountPath: "/mnt/storage" },
            callback: f,
        });
    }

    // API Gateway
    const api = new awsx.apigateway.API("api", {
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
                        const data = new Buffer(ev.body!, "base64");
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
                    const cmd = new Buffer(ev.body!, "base64").toString();
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
    const cluster = new awsx.ecs.Cluster("cluster", { vpc: vpc });
    const efsVolumeConfiguration: aws.types.input.ecs.TaskDefinitionVolumeEfsVolumeConfiguration = {
        fileSystemId: filesystem.id,
        authorizationConfig: { accessPointId: ap.id },
        rootDirectory: "/www",
        transitEncryption: "ENABLED",
    };

    // Fargate Service
    const nginx = new awsx.ecs.FargateService("nginx", {
        cluster: cluster,
        taskDefinitionArgs: {
            container: {
                image: "nginx",
                memory: 128,
                portMappings: [{ containerPort: 80, hostPort: 80, protocol: "tcp" }],
                mountPoints: [{ containerPath: "/usr/share/nginx/html", sourceVolume: "efs" }],
            },
            volumes: [{ name: "efs", efsVolumeConfiguration }],
        },
        securityGroups: [vpc.vpc.defaultSecurityGroupId, ...cluster.securityGroups],
        subnets: vpc.publicSubnetIds,
        platformVersion: "1.4.0",
    });

    // Exports
    return {
        url: api.url,
    };

};
