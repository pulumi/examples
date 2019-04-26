// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as docker from "@pulumi/docker";
import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as config from "./config";

const adApp = new azure.ad.Application("main");
const adSp = new azure.ad.ServicePrincipal("main", { 
    applicationId: adApp.applicationId,
 });

 const adSpPassword = new azure.ad.ServicePrincipalPassword("main", {
    servicePrincipalId: adSp.id,
    value: config.password,
    endDate: "2099-01-01T00:00:00Z",
});

const cluster = new azure.containerservice.KubernetesCluster("main", {
    resourceGroupName: config.resourceGroup.name,
    location: config.location,

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
    agentPoolProfile: {
        name: "aksagentpool",
        count: 1,
        vmSize: "Standard_D2_v2",
    },
    dnsPrefix: `${pulumi.getStack()}-kube`,
});

const acr = new azure.containerservice.Registry("main", {
    adminEnabled: true,
    location: config.location,
    resourceGroupName: config.resourceGroup.name,
    sku: "Standard",
});

const acrRole = new azure.role.Assignment("main", {
    roleDefinitionName: "acrpull",
    principalId: cluster.servicePrincipal.clientId,
    scope: acr.id,
});

// Expose a K8s provider instance using our custom cluster instance.
const k8sProvider = new k8s.Provider("main", {
    kubeconfig: cluster.kubeConfigRaw,
});

// // Create a Kubernetes Namespace
// const ns = new k8s.core.v1.Namespace("main", {}, { provider: k8sProvider });

// // Export the Namespace name
// const namespaceName = ns.metadata.name;

// const appImage = new docker.Image("main", {
//     imageName: pulumi.interpolate`${acr.loginServer}/my-app`,
//     build: "app",
//     registry: {
//         server: acr.loginServer,
//         username: acr.adminUsername,
//         password: acr.adminPassword,
//     },
// });

// const name = "custom-app";
// Create a NGINX Deployment
// const appLabels = { appClass: name };
// const deployment = new k8s.apps.v1.Deployment("main", {
//     metadata: {
//         namespace: namespaceName,
//         labels: appLabels,
//     },
//     spec: {
//         replicas: 1,
//         selector: { matchLabels: appLabels },
//         template: {
//             metadata: {
//                 labels: appLabels,
//             },
//             spec: {
//                 containers: [
//                     {
//                         name: name,
//                         image: appImage.imageName,
//                         ports: [{ name: "http", containerPort: 80 }],
//                     }
//                 ],
//             }
//         }
//     },
// }, { provider: k8sProvider, });
