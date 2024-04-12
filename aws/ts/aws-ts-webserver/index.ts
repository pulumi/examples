// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Get the id for the latest Amazon Linux AMI
const ami = aws.ec2.getAmi({
    filters: [
        { name: "name", values: ["amzn-ami-hvm-*-x86_64-ebs"] },
    ],
    owners: ["137112412989"], // Amazon
    mostRecent: true,
}).then(result => result.id);

// create a new security group for port 80
const group = new aws.ec2.SecurityGroup("web-secgrp", {
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

// (optional) create a simple web server using the startup script for the instance
const userData =
`#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`;

const server = new aws.ec2.Instance("web-server-www", {
    tags: { "Name": "web-server-www" },
    instanceType: aws.ec2.InstanceType.T2_Micro, // t2.micro is available in the AWS free tier
    vpcSecurityGroupIds: [ group.id ], // reference the group object above
    ami: ami,
    userData: userData,              // start a simple web server
});

export const publicIp = server.publicIp;
export const publicHostName = server.publicDns;
