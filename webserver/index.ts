import * as aws from "@pulumi/aws";
import { Output } from "@pulumi/pulumi";

// the type InstanceType contains friendly names for AWS instance sizes
let size: aws.ec2.InstanceType = "t2.micro"; 

// create a new security group for port 80
let group = new aws.ec2.SecurityGroup("web-secgrp", { 
    description: "Enable HTTP access",
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

// (optional) create a simple web server using the startup script for the instance
// use the AWS metadata service to get the availability zone for the instance
let userData = 
    `#!/bin/bash
    echo "Hello, World!\nInstance metadata:" > index.html
    curl http://169.254.169.254/latest/meta-data/placement/availability-zone >> index.html
    nohup python -m SimpleHTTPServer 80 &`;

let server = new aws.ec2.Instance("web-server-www", {
    tags: { "Name": "web-server-www" },
    instanceType: size,
    securityGroups: [ group.name ],     // reference the group object above
    ami: aws.ec2.getLinuxAMI(size),     // call built-in function (can also be custom)
    userData: userData                  // set up a simple web server    
});

export let publicIp = server.publicIp;
export let publicDns = server.publicDns;