// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";

// Global Config
const config = new pulumi.Config();
const configPassword = config.require("password");
const configSshPublicKey = config.require("sshPublicKey");
const configResourceGroupLocation = config.require("resourceGroupLocation");
const resourceGroup = new azure.core.ResourceGroup("aks", {location: configResourceGroupLocation});

// Per-Cluster Config
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
    value: configPassword,
    endDate: "2099-01-01T00:00:00Z",
});

// Create the individual clusters
const k8sClusters = aksClusterConfig.map((clusterConfig, index) => {
    const cluster = new azure.containerservice.KubernetesCluster(`aksCluster-${clusterConfig.name}`, {
        resourceGroupName: resourceGroup.name,
        location: clusterConfig.location,
        agentPoolProfile: {
            name: "aksagentpool",
            count: clusterConfig.nodeCount,
            vmSize: clusterConfig.nodeSize,
        },
        dnsPrefix: `${pulumi.getStack()}-kube`,
        linuxProfile: {
            adminUsername: "aksuser",
            sshKeys: [{
                keyData: configSshPublicKey,
            }],
        },
        servicePrincipal: {
            clientId: adApp.applicationId,
            clientSecret: adSpPassword.value,
        },
    });
    return cluster;
});

export const aksClusterNames = k8sClusters.map(cluster => cluster.name);
