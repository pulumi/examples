// Copyright 2016-2024, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";
const aws = require("@pulumi/aws");
const docker = require("@pulumi/docker");
const pulumi = require("@pulumi/pulumi");

const config = new pulumi.Config();
const vpcCidr = config.get("vpc-cidr") || "10.0.0.0/16";
const subnet1Cidr = config.get("subnet-1-cidr") || "10.0.0.0/24";
const subnet2Cidr = config.get("subnet-2-cidr") || "10.0.1.0/24";
const containerContext = config.get("container-context") || ".";
const containerFile = config.get("container-file") || "./Dockerfile";
const openApiKey = config.get("open-api-key") || "CHANGEME";
const availabilityZones = [
    "eu-central-1a",
    "eu-central-1b",
];
const current = aws.getCallerIdentityOutput({});
const pulumiProject = pulumi.getProject();
const pulumiStack = pulumi.getStack();
const langserveEcrRepository = new aws.ecr.Repository("langserve-ecr-repository", {
    name: `${pulumiProject}-${pulumiStack}`,
    forceDelete: true,
});
const token = aws.ecr.getAuthorizationTokenOutput({
    registryId: langserveEcrRepository.registryId,
});
const accountId = current.apply(current => current.accountId);
const langserveEcrLifeCyclePolicy = new aws.ecr.LifecyclePolicy("langserve-ecr-life-cycle-policy", {
    repository: langserveEcrRepository.name,
    policy: JSON.stringify({
        rules: [{
            rulePriority: 1,
            description: "Expire images when they are more than 10 available",
            selection: {
                tagStatus: "any",
                countType: "imageCountMoreThan",
                countNumber: 10,
            },
            action: {
                type: "expire",
            },
        }],
    }),
});
const langserveEcrImage = new docker.Image("langserve-ecr-image", {
    build: {
        platform: "linux/amd64",
        context: containerContext,
        dockerfile: containerFile,
    },
    imageName: langserveEcrRepository.repositoryUrl,
    registry: {
        server: langserveEcrRepository.repositoryUrl,
        username: token.apply(token => token.userName),
        password: pulumi.secret(token.apply(token => token.password)),
    },
});
const langserveVpc = new aws.ec2.Vpc("langserve-vpc", {
    cidrBlock: vpcCidr,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    instanceTenancy: "default",
    tags: {
        Name: `${pulumiProject}-${pulumiStack}`,
    },
});
const langserveRt = new aws.ec2.RouteTable("langserve-rt", {
    vpcId: langserveVpc.id,
    tags: {
        Name: `${pulumiProject}-${pulumiStack}`,
    },
});
const langserveIgw = new aws.ec2.InternetGateway("langserve-igw", {
    vpcId: langserveVpc.id,
    tags: {
        Name: `${pulumiProject}-${pulumiStack}`,
    },
});
const langserveRoute = new aws.ec2.Route("langserve-route", {
    routeTableId: langserveRt.id,
    destinationCidrBlock: "0.0.0.0/0",
    gatewayId: langserveIgw.id,
});
const langserveSubnet1 = new aws.ec2.Subnet("langserve-subnet1", {
    vpcId: langserveVpc.id,
    cidrBlock: subnet1Cidr,
    availabilityZone: availabilityZones[0],
    mapPublicIpOnLaunch: true,
    tags: {
        Name: `${pulumiProject}-${pulumiStack}-1`,
    },
});
const langserveSubnet2 = new aws.ec2.Subnet("langserve-subnet2", {
    vpcId: langserveVpc.id,
    cidrBlock: subnet2Cidr,
    availabilityZone: availabilityZones[1],
    mapPublicIpOnLaunch: true,
    tags: {
        Name: `${pulumiProject}-${pulumiStack}-2`,
    },
});
const langserveSubnet1RtAssoc = new aws.ec2.RouteTableAssociation("langserve-subnet1-rt-assoc", {
    subnetId: langserveSubnet1.id,
    routeTableId: langserveRt.id,
});
const langserveSubnet2RtAssoc = new aws.ec2.RouteTableAssociation("langserve-subnet2-rt-assoc", {
    subnetId: langserveSubnet2.id,
    routeTableId: langserveRt.id,
});
const langserveEcsCluster = new aws.ecs.Cluster("langserve-ecs-cluster", {
    configuration: {
        executeCommandConfiguration: {
            logging: "DEFAULT",
        },
    },
    settings: [{
        name: "containerInsights",
        value: "disabled",
    }],
    tags: {
        Name: `${pulumiProject}-${pulumiStack}`,
    },
});
const langserveClusterCapacityProviders = new aws.ecs.ClusterCapacityProviders("langserve-cluster-capacity-providers", {
    clusterName: langserveEcsCluster.name,
    capacityProviders: [
        "FARGATE",
        "FARGATE_SPOT",
    ],
});
const langserveSecurityGroup = new aws.ec2.SecurityGroup("langserve-security-group", {
    vpcId: langserveVpc.id,
    ingress: [{
        protocol: "tcp",
        fromPort: 80,
        toPort: 80,
        cidrBlocks: ["0.0.0.0/0"],
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});
const langserveLoadBalancer = new aws.lb.LoadBalancer("langserve-load-balancer", {
    loadBalancerType: "application",
    securityGroups: [langserveSecurityGroup.id],
    subnets: [
        langserveSubnet1.id,
        langserveSubnet2.id,
    ],
});
const langserveTargetGroup = new aws.lb.TargetGroup("langserve-target-group", {
    port: 80,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: langserveVpc.id,
});
const langserveListener = new aws.lb.Listener("langserve-listener", {
    loadBalancerArn: langserveLoadBalancer.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{
        type: "forward",
        targetGroupArn: langserveTargetGroup.arn,
    }],
});
const langserveLogGroup = new aws.cloudwatch.LogGroup("langserve-log-group", {retentionInDays: 7});
const langserveKey = new aws.kms.Key("langserve-key", {
    description: "Key for encrypting secrets",
    enableKeyRotation: true,
    policy: pulumi.all([accountId, accountId]).apply(([accountId, accountId1]) => JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: {
                    AWS: `arn:aws:iam::${accountId}:root`,
                },
                Action: [
                    "kms:Create*",
                    "kms:Describe*",
                    "kms:Enable*",
                    "kms:List*",
                    "kms:Put*",
                    "kms:Update*",
                    "kms:Revoke*",
                    "kms:Disable*",
                    "kms:Get*",
                    "kms:Delete*",
                    "kms:ScheduleKeyDeletion",
                    "kms:CancelKeyDeletion",
                    "kms:Tag*",
                    "kms:UntagResource",
                ],
                Resource: "*",
            },
            {
                Effect: "Allow",
                Principal: {
                    AWS: `arn:aws:iam::${accountId1}:root`,
                },
                Action: [
                    "kms:Encrypt",
                    "kms:Decrypt",
                    "kms:ReEncrypt*",
                    "kms:GenerateDataKey*",
                    "kms:DescribeKey",
                ],
                Resource: "*",
            },
        ],
    })),
    tags: {
        "pulumi-application": pulumiProject,
        "pulumi-environment": pulumiStack,
    },
});
const langserveSsmParameter = new aws.ssm.Parameter("langserve-ssm-parameter", {
    type: "SecureString",
    value: openApiKey,
    keyId: langserveKey.keyId,
    name: `/pulumi/${pulumiProject}/${pulumiStack}/OPENAI_API_KEY`,
    tags: {
        "pulumi-application": pulumiProject,
        "pulumi-environment": pulumiStack,
    },
});
const langserveExecutionRole = new aws.iam.Role("langserve-execution-role", {
    assumeRolePolicy: JSON.stringify({
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "ecs-tasks.amazonaws.com",
            },
        }],
        Version: "2012-10-17",
    }),
    inlinePolicies: [{
        name: `${pulumiProject}-${pulumiStack}-service-secrets-policy`,
        policy: pulumi.all([langserveSsmParameter.arn, langserveKey.arn]).apply(([langserveSsmParameterArn, langserveKeyArn]) => JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Action: ["ssm:GetParameters"],
                    Condition: {
                        StringEquals: {
                            "ssm:ResourceTag/pulumi-application": pulumiProject,
                            "ssm:ResourceTag/pulumi-environment": pulumiStack,
                        },
                    },
                    Effect: "Allow",
                    Resource: [langserveSsmParameterArn],
                },
                {
                    Action: ["kms:Decrypt"],
                    Condition: {
                        StringEquals: {
                            "aws:ResourceTag/pulumi-application": pulumiProject,
                            "aws:ResourceTag/pulumi-environment": pulumiStack,
                        },
                    },
                    Effect: "Allow",
                    Resource: [langserveKeyArn],
                    Sid: "DecryptTaggedKMSKey",
                },
            ],
        })),
    }],
    managedPolicyArns: ["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"],
});
const langserveTaskRole = new aws.iam.Role("langserve-task-role", {
    assumeRolePolicy: JSON.stringify({
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "ecs-tasks.amazonaws.com",
            },
        }],
        Version: "2012-10-17",
    }),
    inlinePolicies: [
        {
            name: "ExecuteCommand",
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: [
                            "ssmmessages:CreateControlChannel",
                            "ssmmessages:OpenControlChannel",
                            "ssmmessages:CreateDataChannel",
                            "ssmmessages:OpenDataChannel",
                        ],
                        Effect: "Allow",
                        Resource: "*",
                    },
                    {
                        Action: [
                            "logs:CreateLogStream",
                            "logs:DescribeLogGroups",
                            "logs:DescribeLogStreams",
                            "logs:PutLogEvents",
                        ],
                        Effect: "Allow",
                        Resource: "*",
                    },
                ],
            }),
        },
        {
            name: "DenyIAM",
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Action: "iam:*",
                    Effect: "Deny",
                    Resource: "*",
                }],
            }),
        },
    ],
});
const langserveTaskDefinition = new aws.ecs.TaskDefinition("langserve-task-definition", {
    family: `${pulumiProject}-${pulumiStack}`,
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    executionRoleArn: langserveExecutionRole.arn,
    taskRoleArn: langserveTaskRole.arn,
    requiresCompatibilities: ["FARGATE"],
    containerDefinitions: pulumi.all([langserveEcrImage.repoDigest, langserveSsmParameter.name, langserveLogGroup.name]).apply(([repoDigest, langserveSsmParameterName, langserveLogGroupName]) => JSON.stringify([{
        name: `${pulumiProject}-${pulumiStack}-service`,
        image: repoDigest,
        cpu: 0,
        portMappings: [{
            name: "target",
            containerPort: 8080,
            hostPort: 8080,
            protocol: "tcp",
        }],
        essential: true,
        secrets: [{
            name: "OPENAI_API_KEY",
            valueFrom: langserveSsmParameterName,
        }],
        logConfiguration: {
            logDriver: "awslogs",
            options: {
                "awslogs-group": langserveLogGroupName,
                "awslogs-region": "eu-central-1",
                "awslogs-stream-prefix": "pulumi-langserve",
            },
        },
    }])),
});
const langserveEcsSecurityGroup = new aws.ec2.SecurityGroup("langserve-ecs-security-group", {
    vpcId: langserveVpc.id,
    ingress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});
const langserveServiceDiscoveryNamespace = new aws.servicediscovery.PrivateDnsNamespace("langserve-service-discovery-namespace", {
    name: `${pulumiStack}.${pulumiProject}.local`,
    vpc: langserveVpc.id,
});
const langserveService = new aws.ecs.Service("langserve-service", {
    cluster: langserveEcsCluster.arn,
    taskDefinition: langserveTaskDefinition.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    networkConfiguration: {
        assignPublicIp: true,
        securityGroups: [langserveEcsSecurityGroup.id],
        subnets: [
            langserveSubnet1.id,
            langserveSubnet2.id,
        ],
    },
    loadBalancers: [{
        targetGroupArn: langserveTargetGroup.arn,
        containerName: `${pulumiProject}-${pulumiStack}-service`,
        containerPort: 8080,
    }],
    schedulingStrategy: "REPLICA",
    serviceConnectConfiguration: {
        enabled: true,
        namespace: langserveServiceDiscoveryNamespace.arn,
    },
    tags: {
        Name: `${pulumiProject}-${pulumiStack}`,
    },
});

exports.url = pulumi.interpolate`http://${langserveLoadBalancer.dnsName}`;
