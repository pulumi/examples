"use strict";

const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

// Get the id for the latest Amazon Linux AMI
let ami = aws.ec2.getAmi({
    filters: [
        { name: "name", values: ["amzn2-ami-hvm-*"] },
    ],
    owners: ["amazon"],
    mostRecent: true,
}, { async: true }).then(result => result.id);

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
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`;

exports.createInstance = function (name, size) {
    return new aws.ec2.Instance(name, {
        tags: { "Name": name },
        instanceType: size,
        vpcSecurityGroupIds: [ group.id ], // reference the group object above
        ami: ami,
        userData: userData              // start a simple web server
    });
}
