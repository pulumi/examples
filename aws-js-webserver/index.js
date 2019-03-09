"use strict";

const aws = require("@pulumi/aws");

let size = "t2.micro";    // t2.micro is available in the AWS free tier

// let ami  = "ami-7172b611" // AMI for Amazon Linux in us-west-2 (Oregon)
let ami  = "ami-c55673a0" // AMI for us-east-2 (Ohio)
// let ami  = "ami-6869aa05" // AMI for us-east-1 (Virginia)
// let ami  = "ami-31490d51" // AMI for us-west-1 (California)
// let ami  = "ami-f9dd458a" // AMI for eu-west-1 (Ireland)
// let ami  = "ami-ea26ce85" // AMI for eu-central-1 (Frankfurt)

// create a new security group for port 80
let group = new aws.ec2.SecurityGroup("web-secgrp", {
    ingress: [
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

// (optional) create a simple web server using the startup script for the instance
let userData =
`#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`;

let server = new aws.ec2.Instance("web-server-www", {
    tags: { "Name": "web-server-www" },
    instanceType: size,
    securityGroups: [ group.name ], // reference the group object above
    ami: ami,
    userData: userData              // start a simple web server
});

exports.publicIp = server.publicIp;
exports.publicHostName = server.publicDns;