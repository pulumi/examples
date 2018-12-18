// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";
import * as config from "./config";

// Per-cluster config
const aksClusterConfig = [
    {
        name: 'east',
        location: "East US",
        nodeCount: 2,
        nodeSize: "Standard_D2_v2",
    },
    {
        name: 'west',
        location: "West US",
        nodeCount: 5,
        nodeSize: "Standard_D2_v2",
    },
];

// Create the AD service principal for the K8s cluster.
const adApp = new azure.ad.Application("aks");
const adSp = new azure.ad.ServicePrincipal("aksSp", {applicationId: adApp.applicationId});
const adSpPassword = new azure.ad.ServicePrincipalPassword("aksSpPassword", {
    servicePrincipalId: adSp.id,
    value: config.password,
    endDate: "2099-01-01T00:00:00Z",
});

// Create the individual clusters
const k8sClusters = aksClusterConfig.map((perClusterConfig, index) => {
    const cluster = new azure.containerservice.KubernetesCluster(`aksCluster-${perClusterConfig.name}`, {
        // Global config arguments
        resourceGroupName: config.resourceGroup.name,
        linuxProfile: {
            adminUsername: "aksuser",
            sshKeys: [{
                keyData: config.sshPublicKey,
            }],
        },
        servicePrincipal: {
            clientId: adApp.applicationId,
            clientSecret: adSpPassword.value,
        },
        // Per-cluster config arguments
        location: perClusterConfig.location,
        agentPoolProfile: {
            name: "aksagentpool",
            count: perClusterConfig.nodeCount,
            vmSize: perClusterConfig.nodeSize,
        },
        dnsPrefix: `${pulumi.getStack()}-kube`,
    });
    return cluster;
});

export const aksClusterNames = k8sClusters.map(cluster => cluster.name);
