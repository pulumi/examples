// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

import * as containerinstance from "@pulumi/azure-native/containerinstance";
import * as resources from "@pulumi/azure-native/resources";

const resourceGroup = new resources.ResourceGroup("aci-ts-rg");

const imageName = "mcr.microsoft.com/azuredocs/aci-helloworld";
const containerGroup = new containerinstance.ContainerGroup("containerGroup", {
    resourceGroupName: resourceGroup.name,
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
