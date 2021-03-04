// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";

export const group = new aws.ec2.SecurityGroup("web-secgrp", {
    ingress: [
        // uncomment to fail a test:
        // { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

const amiId = aws.ec2.getAmi({
    mostRecent: true,
    owners: ["099720109477"],
    filters: [{
        name: "name",
        values: ["ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*"],
    }],
}).then(ami => ami.id);

export const server = new aws.ec2.Instance("web-server-www", {
    instanceType: "t2.micro",
    vpcSecurityGroupIds: [ group.id ], // reference the group object above
    ami: amiId,
    // comment to fail a test:
    tags: { Name: "www-server" },   // name tag
    // uncomment to fail a test:
    // userData: `#!/bin/bash echo "Hello, World!" > index.html nohup python -m SimpleHTTPServer 80 &`,
});

export const publicIp = server.publicIp;
export const publicHostName = server.publicDns;
