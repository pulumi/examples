// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// CloudWatch
const dashboard = new aws.cloudwatch.Dashboard("mydashboard", {
    dashboardName: "my-dashboard",
    dashboardBody: JSON.stringify({
        widgets: [
            {
                type: "metric",
                x: 0,
                y: 0,
                width: 12,
                height: 6,
                properties: {
                    metrics: [
                        [
                            "AWS/EC2",
                            "CPUUtilization",
                            "InstanceId",
                            "i-012345",
                        ],
                    ],
                    period: 300,
                    stat: "Average",
                    region: "us-east-1",
                    title: "EC2 Instance CPU",
                },
            },
            {
                type: "text",
                x: 0,
                y: 7,
                width: 3,
                height: 3,
                properties: {
                    markdown: "Hello world",
                },
            },
        ],
    }),
});

const loginsTopic = new aws.sns.Topic("myloginstopic");

const eventRule = new aws.cloudwatch.EventRule("myeventrule", {
    eventPattern: JSON.stringify({
        "detail-type": [
            "AWS Console Sign In via CloudTrail",
        ],
    }),
});

const eventTarget = new aws.cloudwatch.EventTarget("myeventtarget", {
    rule: eventRule.name,
    targetId: "SendToSNS",
    arn: loginsTopic.arn,
});

const logGroup = new aws.cloudwatch.LogGroup("myloggroup");

const logMetricFilter = new aws.cloudwatch.LogMetricFilter("mylogmetricfilter", {
    pattern: "",
    logGroupName: logGroup.name,
    metricTransformation: {
        name: "EventCount",
        namespace: "YourNamespace",
        value: "1",
    },
});

const logStream = new aws.cloudwatch.LogStream("mylogstream", {
    logGroupName: logGroup.name,
});

const metricAlarm = new aws.cloudwatch.MetricAlarm("mymetricalarm", {
    comparisonOperator: "GreaterThanOrEqualToThreshold",
    evaluationPeriods: 2,
    metricName: "CPUUtilization",
    namespace: "AWS/EC2",
    period: 120,
    statistic: "Average",
    threshold: 80,
    alarmDescription: "This metric monitors ec2 cpu utilization",
});

// DynamoDB
const db = new aws.dynamodb.Table("mytable", {
    attributes: [
        { name: "Id", type: "S" },
    ],
    hashKey: "Id",
    readCapacity: 1,
    writeCapacity: 1,
});

// EC2
const eip = new aws.ec2.Eip("myeip");

const securityGroup = new aws.ec2.SecurityGroup("mysecuritygroup", {
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

const vpc = new aws.ec2.Vpc("myvpc", {
    cidrBlock: "10.0.0.0/16",
});

const internetGateway = new aws.ec2.InternetGateway("myinternetgateway", {
    vpcId: vpc.id,
});

const publicRouteTable = new aws.ec2.RouteTable("myroutetable", {
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: internetGateway.id,
        },
    ],
    vpcId: vpc.id,
});

// ECR
const repository = new aws.ecr.Repository("myrepository");

const repositoryPolicy = new aws.ecr.RepositoryPolicy("myrepositorypolicy", {
    repository: repository.id,
    policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Sid: "new policy",
            Effect: "Allow",
            Principal: "*",
            Action: [
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:BatchCheckLayerAvailability",
                "ecr:PutImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload",
                "ecr:DescribeRepositories",
                "ecr:GetRepositoryPolicy",
                "ecr:ListImages",
                "ecr:DeleteRepository",
                "ecr:BatchDeleteImage",
                "ecr:SetRepositoryPolicy",
                "ecr:DeleteRepositoryPolicy",
            ],
        }],
    }),
});

const lifecyclePolicy = new aws.ecr.LifecyclePolicy("mylifecyclepolicy", {
    repository: repository.id,
    policy: JSON.stringify({
        rules: [{
            rulePriority: 1,
            description: "Expire images older than 14 days",
            selection: {
                tagStatus: "untagged",
                countType: "sinceImagePushed",
                countUnit: "days",
                countNumber: 14,
            },
            action: {
                type: "expire",
            },
        }],
    }),
});

// ECS
const cluster = new aws.ecs.Cluster("mycluster");

// IAM
const role = new aws.iam.Role("myrole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ec2.amazonaws.com" }),
});

const rolePolicy = new aws.iam.RolePolicy("myrolepolicy", {
    role: role.id,
    policy: {
        Version: "2012-10-17",
        Statement: [{
            Action: [ "ec2:Describe*" ],
            Effect: "Allow",
            Resource: "*",
        }],
    },
});

const policy = new aws.iam.Policy("mypolicy", {
    policy: {
        Version: "2012-10-17",
        Statement: [{
            Action: [
              "ec2:Describe*",
            ],
            Effect: "Allow",
            Resource: "*",
        }],
    },
});

const rolePolicyAttachment = new aws.iam.RolePolicyAttachment("myrolepolicyattachment", {
    role: role,
    policyArn: policy.arn,
});

const user = new aws.iam.User("myuser");

const group = new aws.iam.Group("mygroup");

// const policyAttachment = new aws.iam.PolicyAttachment("mypolicyattachment", {
//     users: [user],
//     groups: [group],
//     roles: [role],
//     policyArn: policy.arn,
// });

// Kinesis
const stream = new aws.kinesis.Stream("mystream", {
    shardCount: 1,
});

// SQS
const queue = new aws.sqs.Queue("myqueue");

// SNS
const topic = new aws.sns.Topic("mytopic");

const topicSubscription = new aws.sns.TopicSubscription("mytopicsubscription", {
    topic: topic,
    protocol: "sqs",
    endpoint: queue.arn,
});
