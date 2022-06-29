// Copyright 2022, Pulumi Corporation.

import * as aws from "@pulumi/aws";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";

const config = new pulumi.Config();
// A path to the EC2 keypair's public key:
const publicKeyPath = config.require("publicKeyPath");
// A path to the EC2 keypair's private key:
const privateKeyPath = config.require("privateKeyPath");
// The WordPress database size:
const dbInstanceSize = config.get("dbInstanceSize") || "db.t3.small";
// The WordPress database name:
const dbName = config.get("dbName") || "wordpressdb";
// The WordPress database user's name:
const dbUsername = config.get("dbUsername") || "admin";
// The WordPress database user's password:
const dbPassword = config.requireSecret("dbPassword");
// The WordPress EC2 instance's size:
const ec2InstanceSize = config.get("ec2InstanceSize") || "t3.small";

// Dynamically fetch AZs so we can spread across them.
const availabilityZones = aws.getAvailabilityZones();

// Dynamically query for the Amazon Linux 2 AMI in this region.
const awsLinuxAmi = aws.ec2.getAmi({
    owners: ["amazon"],
    filters: [{
        name: "name",
        values: ["amzn2-ami-hvm-*-x86_64-ebs"],
    }],
    mostRecent: true,
});

// Read in the public key for easy use below.
const publicKey = fs.readFileSync(publicKeyPath).toString();
// Read in the private key for easy use below (and to ensure it's marked a secret!)
const privateKey = pulumi.secret(fs.readFileSync(privateKeyPath).toString());

// Set up a Virtual Private Cloud to deploy our EC2 instance and RDS datbase into.
const prodVpc = new aws.ec2.Vpc("prod-vpc", {
    cidrBlock: "10.192.0.0/16",
    enableDnsSupport: true, // gives you an internal domain name.
    enableDnsHostnames: true, // gives you an internal host name.
    enableClassiclink: false,
    instanceTenancy: "default",
});

// Create public subnets for the EC2 instance.
const prodSubnetPublic1 = new aws.ec2.Subnet("prod-subnet-public-1", {
    vpcId: prodVpc.id,
    cidrBlock: "10.192.0.0/24",
    mapPublicIpOnLaunch: true, // public
    availabilityZone: availabilityZones.then(azs => azs.names[0]),
});

// Create private subnets for RDS:
const prodSubnetPrivate1 = new aws.ec2.Subnet("prod-subnet-private-1", {
    vpcId: prodVpc.id,
    cidrBlock: "10.192.20.0/24",
    mapPublicIpOnLaunch: false, // private
    availabilityZone: availabilityZones.then(azs => azs.names[1]),
});
const prodSubnetPrivate2 = new aws.ec2.Subnet("prod-subnet-private-2", {
    vpcId: prodVpc.id,
    cidrBlock: "10.192.21.0/24",
    mapPublicIpOnLaunch: false, // private
    availabilityZone: availabilityZones.then(azs => azs.names[2]),
});

// Create a gateway for internet connectivity:
const prodIgw = new aws.ec2.InternetGateway("prod-igw", {vpcId: prodVpc.id});

// Create a route table:
const prodPublicRt = new aws.ec2.RouteTable("prod-public-rt", {
    vpcId: prodVpc.id,
    routes: [{
        // associated subnets can reach anywhere.
        cidrBlock: "0.0.0.0/0",
        // use this IGW to reach the internet.
        gatewayId: prodIgw.id,
    }],
});
const prodRtaPublicSubnet1 = new aws.ec2.RouteTableAssociation("prod-rta-public-subnet-1", {
    subnetId: prodSubnetPublic1.id,
    routeTableId: prodPublicRt.id,
});

// Security group for EC2:
const ec2AllowRule = new aws.ec2.SecurityGroup("ec2-allow-rule", {
    vpcId: prodVpc.id,
    ingress: [
        {
            description: "HTTPS",
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"],
        },
        {
            description: "HTTP",
            fromPort: 80,
            toPort: 80,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"],
        },
        {
            description: "SSH",
            fromPort: 22,
            toPort: 22,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"],
        },
    ],
    egress: [{
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
    }],
    tags: {
        Name: "allow ssh,http,https",
    },
});

// Security group for RDS:
const rdsAllowRule = new aws.ec2.SecurityGroup("rds-allow-rule", {
    vpcId: prodVpc.id,
    ingress: [{
        description: "MySQL",
        fromPort: 3306,
        toPort: 3306,
        protocol: "tcp",
        securityGroups: [ec2AllowRule.id],
    }],
    // Allow all outbound traffic.
    egress: [{
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
    }],
    tags: {
        Name: "allow ec2",
    },
});

// Create an RDS subnet group:
const rdsSubnetGrp = new aws.rds.SubnetGroup("rds-subnet-grp", {subnetIds: [
    prodSubnetPrivate1.id,
    prodSubnetPrivate2.id,
]});

// Create the RDS instance:
const wordpressdb = new aws.rds.Instance("wordpressdb", {
    allocatedStorage: 10,
    engine: "mysql",
    engineVersion: "5.7",
    instanceClass: dbInstanceSize,
    dbSubnetGroupName: rdsSubnetGrp.id,
    vpcSecurityGroupIds: [rdsAllowRule.id],
    dbName: dbName,
    username: dbUsername,
    password: dbPassword,
    skipFinalSnapshot: true,
});

// Create a keypair to access the EC2 instance:
const wordpressKeypair = new aws.ec2.KeyPair("wordpress-keypair", {publicKey: publicKey});

// Create an EC2 instance to run Wordpress (after RDS is ready).
const wordpressInstance = new aws.ec2.Instance("wordpress-instance", {
    ami: awsLinuxAmi.then(awsLinuxAmi => awsLinuxAmi.id),
    instanceType: ec2InstanceSize,
    subnetId: prodSubnetPublic1.id,
    vpcSecurityGroupIds: [ec2AllowRule.id],
    keyName: wordpressKeypair.id,
    tags: {
        Name: "Wordpress.web",
    },
}, {
    // Only create after RDS is provisioned.
    dependsOn: [wordpressdb],
});

// Give our EC2 instance an elastic IP address.
const wordpressEip = new aws.ec2.Eip("wordpress-eip", {instance: wordpressInstance.id});

// Render the Ansible playbook using RDS info.
const renderPlaybookCmd = new command.local.Command("renderPlaybookCmd", {
    create: "cat playbook.yml | envsubst > playbook_rendered.yml",
    environment: {
        DB_RDS: wordpressdb.endpoint,
        DB_NAME: dbName,
        DB_USERNAME: dbUsername,
        DB_PASSWORD: dbPassword,
    },
});

// Run a script to update Python on the remote machine.
const updatePythonCmd = new command.remote.Command("updatePythonCmd", {
    connection: {
        host: wordpressEip.publicIp,
        port: 22,
        user: "ec2-user",
        privateKey: privateKey,
    },
    create: `(sudo yum update -y || true);
(sudo yum install python35 -y);
(sudo yum install amazon-linux-extras -y)
`,
});

// Finally, play the Ansible playbook to finish installing.
const playAnsiblePlaybookCmd = new command.local.Command("playAnsiblePlaybookCmd", {
    create: pulumi.interpolate`ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
-u ec2-user -i '${wordpressEip.publicIp},' \
--private-key ${privateKeyPath} \
playbook_rendered.yml`,
}, {
    dependsOn: [
        renderPlaybookCmd,
        updatePythonCmd,
    ],
});

// Export the resulting wordpress EIP for easy access.
export const url = wordpressEip.publicIp;
