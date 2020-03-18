// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";

export let group = new aws.ec2.SecurityGroup("web-secgrp", {
    ingress: [
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

const userData = `#!/bin/bash echo "Hello, World!" > index.html nohup python -m SimpleHTTPServer 80 &`;

export let server = new aws.ec2.Instance("web-server-www", {
    instanceType: "t2.micro",
    securityGroups: [ group.name ], // reference the group object above
    ami: "ami-c55673a0",            // AMI for us-east-2 (Ohio),
    userData: userData,             // start a simple web server
});

export const publicIp = server.publicIp;
export const publicHostName = server.publicDns;

// PULUMI_TEST_MODE=true  \
//   PULUMI_NODEJS_STACK="my-ws" \
//   PULUMI_NODEJS_PROJECT="dev" \
//   PULUMI_CONFIG='{ "aws:region": "us-west-2" }'  \
//   mocha -r ts-node/register ec2tests.ts
