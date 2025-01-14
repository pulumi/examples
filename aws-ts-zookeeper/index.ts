// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";


const config = new pulumi.Config();
const projectName = "zookeeper";
const environment = config.require("environment");

// VPC Configuration
const vpc = new awsx.ec2.Vpc(`${projectName}-vpc`, {
    numberOfAvailabilityZones: 3,
    natGateways: {
        strategy: environment === "production" ? "OnePerAz" : "Single",
    },
    tags: {
        Name: `${projectName}-vpc`,
        Environment: environment,
    },
});

// Security Groups
const zookeeperSG = new aws.ec2.SecurityGroup(`${projectName}-sg`, {
    vpcId: vpc.vpcId,
    description: "Security group for ZooKeeper nodes",
    ingress: [
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["10.0.0.0/8"] },  // SSH
        { protocol: "tcp", fromPort: 2181, toPort: 2181, cidrBlocks: ["10.0.0.0/8"] },  // Client port
        { protocol: "tcp", fromPort: 2888, toPort: 2888, cidrBlocks: ["10.0.0.0/8"] },  // Follower port
        { protocol: "tcp", fromPort: 3888, toPort: 3888, cidrBlocks: ["10.0.0.0/8"] },  // Election port
    ],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
    tags: {
        Name: `${projectName}-sg`,
        Environment: environment,
    },
});

// IAM Role and Instance Profile
const zookeeperRole = new aws.iam.Role(`${projectName}-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "ec2.amazonaws.com",
    }),
});

const zookeeperInstanceProfile = new aws.iam.InstanceProfile(`${projectName}-instance-profile`, {
    role: zookeeperRole.name,
});

// SSM Policy Attachment
const ssmPolicy = new aws.iam.RolePolicyAttachment(`${projectName}-ssm-policy`, {
    role: zookeeperRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
});

// CloudWatch Policy
const cloudwatchPolicy = new aws.iam.RolePolicy(`${projectName}-cloudwatch-policy`, {
    role: zookeeperRole.name,
    policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Action: [
                "cloudwatch:PutMetricData",
                "cloudwatch:GetMetricData",
                "cloudwatch:ListMetrics",
            ],
            Resource: "*",
        }],
    }),
});

// Launch Template User Data Script
const getUserData = (id: number) => `#!/bin/bash
apt-get update
apt-get install -y openjdk-11-jdk

# Install ZooKeeper
ZOOKEEPER_VERSION="3.9.3"
wget https://dlcdn.apache.org/zookeeper/zookeeper-$ZOOKEEPER_VERSION/apache-zookeeper-$ZOOKEEPER_VERSION-bin.tar.gz
tar -xzf apache-zookeeper-$ZOOKEEPER_VERSION-bin.tar.gz
mv apache-zookeeper-$ZOOKEEPER_VERSION-bin /opt/zookeeper

# Configure ZooKeeper
cat > /opt/zookeeper/conf/zoo.cfg << EOF
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/var/lib/zookeeper
clientPort=2181
server.1=zk1.internal:2888:3888
server.2=zk2.internal:2888:3888
server.3=zk3.internal:2888:3888
EOF

mkdir -p /var/lib/zookeeper
echo "${id}" > /var/lib/zookeeper/myid

# Create systemd service
cat > /etc/systemd/system/zookeeper.service << EOF
[Unit]
Description=ZooKeeper Service
After=network.target

[Service]
Type=forking
User=root
Group=root
ExecStart=/opt/zookeeper/bin/zkServer.sh start
ExecStop=/opt/zookeeper/bin/zkServer.sh stop
ExecReload=/opt/zookeeper/bin/zkServer.sh restart
WorkingDirectory=/opt/zookeeper

[Install]
WantedBy=multi-user.target
EOF

# Start ZooKeeper
systemctl daemon-reload
systemctl enable zookeeper
systemctl start zookeeper

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
    "metrics": {
        "metrics_collected": {
            "mem": {
                "measurement": ["mem_used_percent"]
            },
            "disk": {
                "measurement": ["disk_used_percent"],
                "resources": ["/"]
            }
        }
    }
}
EOF

systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent`;

// Launch Template
const launchTemplate = new aws.ec2.LaunchTemplate(`${projectName}-launch-template`, {
    namePrefix: `${projectName}-`,
    imageId: "ami-0c7217cdde317cfec",  // Ubuntu 24.04 LTS AMI ID
    instanceType: "t3.medium",
    userData: Buffer.from(getUserData(1)).toString("base64"),
    vpcSecurityGroupIds: [zookeeperSG.id],
    iamInstanceProfile: {
        name: zookeeperInstanceProfile.name,
    },
    blockDeviceMappings: [{
        deviceName: "/dev/sda1",
        ebs: {
            volumeSize: 50,
            volumeType: "gp3",
            deleteOnTermination: "true",
            encrypted: "true",
        },
    }],
    tags: {
        Name: `${projectName}-launch-template`,
        Environment: environment,
    },
    metadataOptions: {
        httpEndpoint: "enabled",
        httpTokens: "required",
        httpPutResponseHopLimit: 1,
    },
});

// Auto Scaling Group
const asg = new aws.autoscaling.Group(`${projectName}-asg`, {
    vpcZoneIdentifiers: vpc.privateSubnetIds,
    desiredCapacity: 3,
    maxSize: 3,
    minSize: 3,
    healthCheckType: "ELB",
    healthCheckGracePeriod: 300,
    launchTemplate: {
        id: launchTemplate.id,
        version: "$Latest",
    },
    tags: [{
        key: "Name",
        value: `${projectName}-node`,
        propagateAtLaunch: true,
    }, {
        key: "Environment",
        value: environment,
        propagateAtLaunch: true,
    }],
});

// Application Load Balancer
const alb = new aws.lb.LoadBalancer(`${projectName}-alb`, {
    internal: true,
    loadBalancerType: "application",
    securityGroups: [zookeeperSG.id],
    subnets: vpc.privateSubnetIds,
    tags: {
        Name: `${projectName}-alb`,
        Environment: environment,
    },
});

// Target Group
const targetGroup = new aws.lb.TargetGroup(`${projectName}-tg`, {
    port: 2181,
    protocol: "HTTP",
    vpcId: vpc.vpcId,
    targetType: "instance",
    healthCheck: {
        enabled: true,
        path: "/",
        port: "2181",
        protocol: "HTTP",
        healthyThreshold: 2,
        unhealthyThreshold: 3,
        timeout: 5,
        interval: 30,
    },
    tags: {
        Name: `${projectName}-tg`,
        Environment: environment,
    },
});

// ALB Listener
const listener = new aws.lb.Listener(`${projectName}-listener`, {
    loadBalancerArn: alb.arn,
    port: 2181,
    protocol: "HTTP",
    defaultActions: [{
        type: "forward",
        targetGroupArn: targetGroup.arn,
    }],
});

// Attach ASG to Target Group
const asgAttachment = new aws.autoscaling.Attachment(`${projectName}-asg-attachment`, {
    autoscalingGroupName: asg.name,
    lbTargetGroupArn: targetGroup.arn,
});

// CloudWatch Alarms
const cpuAlarm = new aws.cloudwatch.MetricAlarm(`${projectName}-cpu-alarm`, {
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 2,
    metricName: "CPUUtilization",
    namespace: "AWS/EC2",
    period: 300,
    statistic: "Average",
    threshold: 80,
    alarmDescription: "This metric monitors ec2 cpu utilization",
    dimensions: {
        AutoScalingGroupName: asg.name,
    },
});

// Export values
export const vpcId = vpc.vpcId;
export const albDnsName = alb.dnsName;
export const asgName = asg.name;
