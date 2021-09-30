// Copyright 2016-2021, Pulumi Corporation.

import * as awsnative from "@pulumi/aws-native";
import * as classic from "./classic";

const cluster = new awsnative.ecs.Cluster("cluster", {
    clusterName: "cloud-api-cluster",
});

const wl = new awsnative.elasticloadbalancingv2.Listener("web", {
    loadBalancerArn: classic.albArn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{
        type: "forward",
        targetGroupArn: classic.atgArn,
    }],
});

const taskDefinition = new awsnative.ecs.TaskDefinition("app-task", {
    family: "fargate-task-definition",
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: classic.roleArn,
    containerDefinitions: [{
        name: "my-app",
        image: "nginx",
        portMappings: [{
            containerPort: 80,
            hostPort: 80,
            protocol: "tcp",
        }],
    }],
});

const service = new awsnative.ecs.Service("app-svc", {
    serviceName: "app-svc-cloud-api",
    cluster: cluster.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    taskDefinition: taskDefinition.taskDefinitionArn,
    networkConfiguration: {
        awsvpcConfiguration: {
            assignPublicIp: "ENABLED",
            subnets: classic.subnetIds,
            securityGroups: [classic.securityGroupId],
        },
    },
    loadBalancers: [{
        targetGroupArn: classic.atgArn,
        containerName: "my-app",
        containerPort: 80,
    }],
}, {dependsOn: [wl]});

export const url = classic.albDnsName;
