// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const baseTags = {
    project: `${pulumi.getProject()}-${pulumi.getStack()}`,
};

const ubuntuAmiId = aws.ec2.getAmi({
    mostRecent: true,
    nameRegex: "ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*",
    owners: ["099720109477"],
}, { async: true }).then(ami => ami.id);

const nginxUserData =
    `#!/bin/bash
apt -y update
apt -y install nginx

# Note: This is AWS-specific. This will fail if the example is modified for another provider.
curl http://169.254.169.254/latest/meta-data/instance-id > /var/www/html/index.html
`;

const nginxSecGroup = new aws.ec2.SecurityGroup("nginx", {
    description: "admin access",
    ingress: [
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
    tags: Object.assign({ Name: `nginx` }, baseTags),
});

const nginxInstances = [];
for (let i = 0; i < 3; i++) {
    const nginxInstance = new aws.ec2.Instance(`nginx-${i}`, {
        ami: ubuntuAmiId,
        instanceType: "t2.medium",
        tags: Object.assign({ Name: `nginx-${i}` }, baseTags),

        vpcSecurityGroupIds: [nginxSecGroup.id],

        userData: nginxUserData,
    });
    nginxInstances.push(nginxInstance);
}

export const instancePublicIps = nginxInstances.map(instance => instance.publicIp.apply(x => x));
