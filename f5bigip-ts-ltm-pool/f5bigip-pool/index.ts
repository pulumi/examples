// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as f5bigip from "@pulumi/f5bigip";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const backendInstances = config.require("backendInstances").split(",");

const baseTags = {
    project: `${pulumi.getProject()}-${pulumi.getStack()}`,
};

const monitor = new f5bigip.ltm.Monitor("backend", {
    name: "/Common/backend",
    parent: "/Common/http",
    send: "GET /\r\n",
    timeout: 5,
    interval: 10,
});

const pool = new f5bigip.ltm.Pool("backend", {
    name: "/Common/backend",
    monitors: [monitor.name],
    allowNat: "yes",
    allowSnat: "yes",
});

const poolAttachments = backendInstances.map((backendAddress, i) => {
    const applicationPoolAttachment = new f5bigip.ltm.PoolAttachment(`backend-${i}`, {
        pool: pool.name,
        node: `/Common/${backendAddress}`,
    });
    return applicationPoolAttachment;
});

const virtualServer = new f5bigip.ltm.VirtualServer("backend", {
    pool: pool.name,
    name: "/Common/backend",
    destination: config.require("f5BigIpPrivateIp"),
    port: 80,
    sourceAddressTranslation: "automap",

}, { dependsOn: [pool] });
