import * as aws from "@pulumi/aws";
import { getLinuxAMI } from "./linuxAmi";

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

export function createInstance(name: string, size: aws.ec2.InstanceType, zone: string): aws.ec2.Instance {
    let result = new aws.ec2.Instance(name, {
        availabilityZone: zone,
        tags: { "Name": name },             // use the `name` parameter
        instanceType: size,                 // use function argument for size
        securityGroups: [ group.name ],     // reference the group object above
        ami: getLinuxAMI(size),             // call custom lookup function
        userData: userData                  // set up a simple web server    
    });

    return result;
}