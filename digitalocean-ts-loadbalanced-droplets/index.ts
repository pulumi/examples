// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as digitalocean from "@pulumi/digitalocean";
import * as pulumi from "@pulumi/pulumi";

const dropletCount = 2;
const region = digitalocean.Region.NYC3;

const dropletTypeTag = new digitalocean.Tag(`demo-app-${pulumi.getStack()}`);
const userData =
    `#!/bin/bash
  sudo apt-get update
  sudo apt-get install -y nginx`;
const droplets = [];
for (let i = 0; i < dropletCount; i++) {
    const nameTag = new digitalocean.Tag(`web-${i}`);
    droplets.push(new digitalocean.Droplet(`web-${i}`, {
        image: "ubuntu-20-04-x64",
        region: region,
        privateNetworking: true,
        size: digitalocean.DropletSlug.DropletS1VCPU1GB,
        tags: [nameTag.id, dropletTypeTag.id],
        userData: userData,
    }));
}

const lb = new digitalocean.LoadBalancer("public", {
    dropletTag: dropletTypeTag.name,
    forwardingRules: [{
        entryPort: 80,
        entryProtocol: digitalocean.Protocol.HTTP,
        targetPort: 80,
        targetProtocol: digitalocean.Protocol.HTTP,
    }],
    healthcheck: {
        port: 80,
        protocol: digitalocean.Protocol.TCP,
    },
    region: region,
});

export const endpoint = lb.ip;
