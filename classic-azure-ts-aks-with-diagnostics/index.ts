// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as azuread from "@pulumi/azuread";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const password = config.require("password");
const location = config.get("location") || "East US";
const nodeCount = config.getNumber("nodeCount") || 2;
const nodeSize = config.get("nodeSize") || "Standard_D2_v2";
const sshPublicKey = config.require("sshPublicKey");

const resourceGroup = new azure.core.ResourceGroup("aks", { location });
const loganalytics = new azure.operationalinsights.AnalyticsWorkspace("aksloganalytics", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: "PerGB2018",
    retentionInDays: 30,
});

// Step 2: Create the AD service principal for the k8s cluster.
const adApp = new azuread.Application("aks", {displayName: "aks"});
const adSp = new azuread.ServicePrincipal("aksSp", { applicationId: adApp.applicationId });
const adSpPassword = new azuread.ServicePrincipalPassword("aksSpPassword", {
    servicePrincipalId: adSp.id,
    value: password,
    endDate: "2099-01-01T00:00:00Z",
});

// Wait for the Service Principle to be initialized. The ServicePrincipal will be used to initialize the AKS cluster during creation
const applicationId = adApp.applicationId.apply(async (adAppId) => {
    let count = 0;
    while (true) {
        try {
            await azuread.getServicePrincipal({
                applicationId: adAppId,
            });
            break;
        } catch (e) {
            console.log("retrying");
            count++;
            if (count > 5) {
                throw e;
            }
        }
    }
    return adAppId;
});

// Step 3: This step creates an AKS cluster.
const k8sCluster = new azure.containerservice.KubernetesCluster("aksCluster", {
    resourceGroupName: resourceGroup.name,
    location: location,
    defaultNodePool: {
        name: "aksagentpool",
        nodeCount: nodeCount,
        vmSize: nodeSize,
    },
    dnsPrefix: `${pulumi.getStack()}-kube`,
    linuxProfile: {
        adminUsername: "aksuser",
        sshKey: { keyData: sshPublicKey},
    },
    servicePrincipal: {
        clientId: applicationId,
        clientSecret: adSpPassword.value,
    },
    addonProfile: {
        omsAgent: {
            enabled: true,
            logAnalyticsWorkspaceId: loganalytics.id,
        },
    },
});

// Step 4: Enables the Monitoring Diagonostic control plane component logs and AllMetrics
const azMonitoringDiagnostic = new azure.monitoring.DiagnosticSetting("aks", {
    logAnalyticsWorkspaceId: loganalytics.id,
    targetResourceId: k8sCluster.id,
    logs:  [{
        category: "kube-apiserver",
        enabled : true,

        retentionPolicy: {
            enabled: true,
        },
    }],
    metrics: [{
        category: "AllMetrics",

        retentionPolicy: {
            enabled: true,
        },
    }],
});

// Step 5: Expose a k8s provider instance using our custom cluster instance.
const k8sProvider = new k8s.Provider("aksK8s", {
    kubeconfig: k8sCluster.kubeConfigRaw,
});

// Export the kubeconfig
export const kubeconfig = k8sCluster.kubeConfigRaw;
