"use strict";

const aws = require("@pulumi/aws");

let size = "t2.micro";    // t2.micro is available in the AWS free tier
let ami  = "ami-7172b611" // AMI for Amazon Linux in us-west-2 (Oregon)
// let ami  = "ami-6869aa05" // AMI for Amazon Linux in us-east-1 (Virginia)

// create a new security group for port 80
let group = new aws.ec2.SecurityGroup("web-secgrp", { 
    description: "Enable HTTP access",
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

// (optional) create a simple web server using the startup script for the instance
let userData = 
`#!/bin/bash
nohup python -m SimpleHTTPServer 80 &`;

let server = new aws.ec2.Instance("web-server-www", {
    tags: { "Name": "web-server-www" },
    instanceType: size,
    securityGroups: [ group.name ], // reference the group object above
    ami: ami,
    userData: userData              // start a simple web server
});

exports.publicIp = server.publicIp;
exports.publicDns = server.publicDns;