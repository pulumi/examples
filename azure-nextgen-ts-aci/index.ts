// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

import * as containerinstance from "@pulumi/azure-nextgen/containerinstance/latest";
import * as resources from "@pulumi/azure-nextgen/resources/latest";

const config = new pulumi.Config();
const location = config.get("location") || "WestUS";

const resourceGroup = new resources.ResourceGroup("resourceGroup", {
    resourceGroupName: "aci-ts-rg",
    location: location,
});

const imageName = "mcr.microsoft.com/azuredocs/aci-helloworld";
const containerGroup = new containerinstance.ContainerGroup("containerGroup", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    containerGroupName: "helloworld",
    osType: "Linux",
    containers: [{
        name: "acilinuxpublicipcontainergroup",
        image: imageName,
            ports: [{ port: 80 }],
            resources: {
                requests: {
                    cpu: 1.0,
                    memoryInGB: 1.5,
                },
            },
    }],
    ipAddress: {
        ports: [{
            port: 80,
            protocol: "Tcp",
        }],
        type: "Public",
    },
    restartPolicy: "always",
});

export const containerIPv4Address = containerGroup.ipAddress.apply(ip => ip?.ip);
