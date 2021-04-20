// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as azuread from "@pulumi/azuread";
import * as pulumi from "@pulumi/pulumi";
import * as config from "./config";

// Per-cluster config
const aksClusterConfig = [
    {
        name: "east",
        location: azure.Locations.EastUS,
        nodeCount: 2,
        nodeSize: "Standard_D2_v2",
    },
    {
        name: "west",
        location: azure.Locations.WestUS,
        nodeCount: 5,
        nodeSize: "Standard_D2_v2",
    },
];

// Create the AD service principal for the K8s cluster.
const adApp = new azuread.Application("aks", {displayName: "aks"});
const adSp = new azuread.ServicePrincipal("aksSp", {applicationId: adApp.applicationId});
const adSpPassword = new azuread.ServicePrincipalPassword("aksSpPassword", {
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
            sshKey: {
                keyData: config.sshPublicKey,
            },
        },
        servicePrincipal: {
            clientId: adApp.applicationId,
            clientSecret: adSpPassword.value,
        },
        // Per-cluster config arguments
        location: perClusterConfig.location,
        defaultNodePool: {
            name: "aksagentpool",
            nodeCount: perClusterConfig.nodeCount,
            vmSize: perClusterConfig.nodeSize,
        },
        dnsPrefix: `${pulumi.getStack()}-kube`,
    });
    return cluster;
});

export const aksClusterNames = k8sClusters.map(cluster => cluster.name);
