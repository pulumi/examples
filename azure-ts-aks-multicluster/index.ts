// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as containerservice from "@pulumi/azure-native/containerservice/v20190601";
import * as azuread from "@pulumi/azuread";
import * as pulumi from "@pulumi/pulumi";
import * as config from "./config";

// Per-cluster config
const aksClusterConfig = [
    {
        name: "east",
        location: "eastus",
        nodeCount: 2,
        nodeSize: containerservice.ContainerServiceVMSizeTypes.Standard_D2_v2,
    },
    {
        name: "west",
        location: "westus",
        nodeCount: 5,
        nodeSize: containerservice.ContainerServiceVMSizeTypes.Standard_D2_v2,
    },
];

// Create the AD service principal for the K8s cluster.
const adApp = new azuread.Application("aks", {
    displayName: "my-aks-multicluster",
});
const adSp = new azuread.ServicePrincipal("aksSp", {applicationId: adApp.applicationId});
const adSpPassword = new azuread.ServicePrincipalPassword("aksSpPassword", {
    servicePrincipalId: adSp.id,
    value: config.password,
    endDate: "2099-01-01T00:00:00Z",
});

// Create the individual clusters
const k8sClusters = aksClusterConfig.map((perClusterConfig, index) => {
    const cluster = new containerservice.ManagedCluster(`aksCluster-${perClusterConfig.name}`, {
        // Global config arguments
        resourceGroupName: config.resourceGroup.name,
        linuxProfile: {
            adminUsername: "aksuser",
            ssh: {
                publicKeys: [{
                    keyData: config.sshPublicKey,
                }],
            },
        },
        servicePrincipalProfile: {
            clientId: adApp.applicationId,
            secret: adSpPassword.value,
        },
        // Per-cluster config arguments
        location: perClusterConfig.location,
        agentPoolProfiles: [{
            name: "aksagentpool",
            count: perClusterConfig.nodeCount,
            vmSize: perClusterConfig.nodeSize,
        }],
        dnsPrefix: `${pulumi.getStack()}-kube`,
        kubernetesVersion: "1.26.3",
    });
    return cluster;
});

export const aksClusterNames = k8sClusters.map(cluster => cluster.name);
