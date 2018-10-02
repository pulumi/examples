// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as config from "./config";

// Create the AD service principal for the K8s cluster.
let adApp = new azure.ad.Application("aks");
let adSp = new azure.ad.ServicePrincipal("aksSp", { applicationId: adApp.applicationId });
let adSpPassword = new azure.ad.ServicePrincipalPassword("aksSpPassword", {
    servicePrincipalId: adSp.id,
    value: config.password,
    endDate: "2099-01-01T00:00:00Z",
});

// Now allocate an AKS cluster.
export const k8sCluster = new azure.containerservice.KubernetesCluster("aksCluster", {
    resourceGroupName: config.resourceGroup.name,
    location: config.location,
    agentPoolProfile: {
        name: "aksagentpool",
        count: config.nodeCount,
        vmSize: config.nodeSize,
    },
    dnsPrefix: `${pulumi.getStack()}-kube`,
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
}); 

// Expose a K8s provider instance using our custom cluster instance.
export const k8sProvider = new k8s.Provider("aksK8s", {
    kubeconfig: k8sCluster.kubeConfigRaw,
});
