// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Interface for backend args
export interface WebServiceArgs {
  dbHost: pulumi.Output<string>;
  dbName: pulumi.Output<string>;
  dbUser: pulumi.Output<string>;
  dbPassword: pulumi.Output<string | undefined>;
  dbPort: string;
  vpcId: pulumi.Output<string>;
  subnetIds: pulumi.Output<string>[];
  securityGroupIds: pulumi.Output<string>[];
}

// Creates DB
export class WebService extends pulumi.ComponentResource {
  public readonly dnsName: pulumi.Output<string>;
  public readonly clusterName: pulumi.Output<string>;

  constructor(name: string, args: WebServiceArgs, opts?: pulumi.ComponentResourceOptions) {

    super("custom:resource:WebService", name, args, opts);

    // Create ECS cluster to run a container-based service
    const cluster = new aws.ecs.Cluster(`${name}-ecs`, {}, { parent: this });

    // Create load balancer to listen for HTTP traffic
    const alb = new aws.lb.LoadBalancer(`${name}-alb`, {
      securityGroups: args.securityGroupIds,
      subnets: args.subnetIds,
    }, { parent: this });

    const atg = new aws.lb.TargetGroup(`${name}-app-tg`, {
      port: 80,
      protocol: "HTTP",
      targetType: "ip",
      vpcId: args.vpcId,
      healthCheck: {
        healthyThreshold: 2,
        interval: 5,
        timeout: 4,
        protocol: "HTTP",
        matcher: "200-399",
      },
    }, { parent: this });

    const wl = new aws.lb.Listener(`${name}-listener`, {
      loadBalancerArn: alb.arn,
      port: 80,
      defaultActions: [
        {
          type: "forward",
          targetGroupArn: atg.arn,
        },
      ],
    }, { parent: this });

    const assumeRolePolicy = {
      "Version": "2008-10-17",
      "Statement": [{
          "Sid": "",
          "Effect": "Allow",
          "Principal": {
              "Service": "ecs-tasks.amazonaws.com",
          },
          "Action": "sts:AssumeRole",
      }],
    };

    const role = new aws.iam.Role(`${name}-task-role`, {
      assumeRolePolicy: JSON.stringify(assumeRolePolicy),
      }, { parent: this });

    const rpa = new aws.iam.RolePolicyAttachment(`${name}-task-policy`, {
      role: role.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    }, { parent: this });

    // Spin up a load balanced service running our container image.
    const taskName = `${name}-app-task`;
    const containerName = `${name}-app-container`;
    const taskDefinition = new aws.ecs.TaskDefinition(taskName, {
        family: "fargate-task-definition",
        cpu: "256",
        memory: "512",
        networkMode: "awsvpc",
        requiresCompatibilities: ["FARGATE"],
        executionRoleArn: role.arn,
        containerDefinitions: pulumi.jsonStringify([{
          "name": containerName,
          "image": "wordpress",
          "portMappings": [{
            "containerPort": 80,
            "hostPort": 80,
            "protocol": "tcp",
          }],
          "environment": [
            {
              "name": "WORDPRESS_DB_HOST",
              "value": pulumi.interpolate `${args.dbHost}:${args.dbPort}`,
            },
            {
              "name": "WORDPRESS_DB_NAME",
              "value": args.dbName,
            },
            {
              "name": "WORDPRESS_DB_USER",
              "value": args.dbUser,
            },
            {
              "name": "WORDPRESS_DB_PASSWORD",
              "value": args.dbPassword,
            },
          ],
        }]),
      }, { parent: this });

    const service = new aws.ecs.Service(`${name}-app-svc`, {
      cluster: cluster.arn,
      desiredCount: 1,
      launchType: "FARGATE",
      taskDefinition: taskDefinition.arn,
      networkConfiguration: {
        assignPublicIp: true,
        subnets: args.subnetIds,
        securityGroups: args.securityGroupIds,
      },
      loadBalancers: [{
          targetGroupArn: atg.arn,
          containerName: containerName,
          containerPort: 80,
      }],
    }, { dependsOn: [wl], parent: this});

    this.dnsName = alb.dnsName;
    this.clusterName = cluster.name;

    this.registerOutputs({});
  }
}
