// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as digitalocean from "@pulumi/digitalocean";
import * as pulumi from "@pulumi/pulumi";

// Get config
const awsConfig = new pulumi.Config("aws");
const awsRegion = awsConfig.get("region");

const projectConfig = new pulumi.Config();
const numberNodes = projectConfig.getNumber("numberNodes") || 2;

// Set IAM roles
const ssmRole = new aws.iam.Role("ssmRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
    aws.iam.Principals.SsmPrincipal,
  ),
});

const ssmCoreRoleAttachment = new aws.iam.RolePolicyAttachment("rpa-ssmrole-ssminstancecore", {
  policyArn: aws.iam.ManagedPolicy.AmazonSSMManagedInstanceCore,
  role: ssmRole,
});

const ssmRoleEc2ContainerAttachment = new aws.iam.RolePolicyAttachment("rpa-ssmrole-ec2containerservice", {
  policyArn: aws.iam.ManagedPolicy.AmazonEC2ContainerServiceforEC2Role,
  role: ssmRole,
});

const executionRole = new aws.iam.Role("taskExecutionRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
    aws.iam.Principals.EcsTasksPrincipal,
  ),
});

const ecsTaskExecutionRoleAttachment = new aws.iam.RolePolicyAttachment("rpa-ecsanywhere-ecstaskexecution", {
  role: executionRole,
  policyArn: aws.iam.ManagedPolicy.AmazonECSTaskExecutionRolePolicy,
});

const taskRole = new aws.iam.Role("taskRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
    aws.iam.Principals.EcsTasksPrincipal,
  ),
});

const taskRolePolicy = new aws.iam.RolePolicy("taskRolePolicy", {
  role: taskRole.id,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel",
        ],
        Resource: "*",
      },
      {
        Effect: "Allow",
        Action: ["logs:DescribeLogGroups"],
        Resource: "*",
      },
      {
        Effect: "Allow",
        Action: [
          "logs:CreateLogStream",
          "logs:CreateLogGroup",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
        ],
        Resource: "*",
      },
    ],
  },
});

// Set up SSM
const ssmActivation = new aws.ssm.Activation("ecsanywhere-ssmactivation", {
  iamRole: ssmRole.name,
  registrationLimit: numberNodes,
});

// Create cluster and export cluster name
const cluster = new aws.ecs.Cluster("cluster");

export const clusterName = cluster.name;

const logGroup = new aws.cloudwatch.LogGroup("logGroup");

// UserData for Droplets
const userData = pulumi
  .all([ssmActivation.activationCode, ssmActivation.id, cluster.name])
  .apply(
    ([activationCode, activationId, clusterName]) => `#!/bin/bash
# Download the ecs-anywhere install Script
curl -o "ecs-anywhere-install.sh" "https://amazon-ecs-agent-packages-preview.s3.us-east-1.amazonaws.com/ecs-anywhere-install.sh" && sudo chmod +x ecs-anywhere-install.sh

# (Optional) Check integrity of the shell script
curl -o "ecs-anywhere-install.sh.sha256" "https://amazon-ecs-agent-packages-preview.s3.us-east-1.amazonaws.com/ecs-anywhere-install.sh.sha256" && sha256sum -c ecs-anywhere-install.sh.sha256

# Run the install script
sudo ./ecs-anywhere-install.sh \
    --cluster ${clusterName} \
    --activation-id ${activationId} \
    --activation-code ${activationCode} \
    --region ${awsRegion}
`,
  );

const loadBalancerTag = new digitalocean.Tag("lb");

for (let i = 1; i <= numberNodes; i++) {
  const droplet = new digitalocean.Droplet(`droplet-${i}`, {
    region: digitalocean.Region.NYC1,
    size: "s-1vcpu-2gb",
    image: "ubuntu-20-04-x64",
    userData: userData,
    tags: [loadBalancerTag.id],
  });
}

// Set up load balancer
const lb = new digitalocean.LoadBalancer("lb", {
  region: digitalocean.Region.NYC1,
  forwardingRules: [
    {
      entryPort: 80,
      entryProtocol: digitalocean.Protocol.HTTP,
      targetPort: 80,
      targetProtocol: digitalocean.Protocol.HTTP,
    },
  ],
  healthcheck: {
    port: 80,
    protocol: digitalocean.Protocol.HTTP,
    path: "/",
  },
  dropletTag: loadBalancerTag.name,
});

// Create ECR repository and build and push docker image
const repo = new awsx.ecr.Repository("app");

const image = new awsx.ecr.Image("app", {
  repositoryUrl: repo.repository.repositoryUrl,
  context: "./app",
});

// Set up task definition
const taskDefinition = new aws.ecs.TaskDefinition("taskdefinition", {
  family: "ecs-anywhere",
  requiresCompatibilities: ["EXTERNAL"],
  taskRoleArn: taskRole.arn,
  executionRoleArn: executionRole.arn,
  containerDefinitions: pulumi.jsonStringify([
    {
      name: "app",
      image: image,
      cpu: 256,
      memory: 256,
      essential: true,
      portMappings: [
        {
          containerPort: 80,
          hostPort: 80,
        },
      ],
      logConfiguration: {
        logDriver: "awslogs",
        options: {
          "awslogs-group": logGroup.name,
          "awslogs-region": awsRegion,
          "awslogs-stream-prefixs": logGroup.namePrefix,
        },
      },
    },
  ]),
});

// Deploy containers to droplets
const service = new aws.ecs.Service("service", {
  launchType: "EXTERNAL",
  taskDefinition: taskDefinition.arn,
  cluster: cluster.id,
  desiredCount: numberNodes - 1,
});

export const ip = lb.ip;
