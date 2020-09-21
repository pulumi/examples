// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.
import * as azuread from "@pulumi/azuread";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as tls from "@pulumi/tls";

import * as containerservice from "@pulumi/azure-nextgen/containerservice/latest";
import * as resources from "@pulumi/azure-nextgen/resources/latest";

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("resourceGroup", {
    resourceGroupName: "azure-nextgen-go-aks",
    location: "WestUS",
});

// Create an AD service principal
const adApp = new azuread.Application("aks");
const adSp = new azuread.ServicePrincipal("aksSp", {
    applicationId: adApp.applicationId,
});

// Generate random password
const password = new random.RandomPassword("password", {
    length: 20,
    special: true,
});

// Create the Service Principal Password
const adSpPassword = new azuread.ServicePrincipalPassword("aksSpPassword", {
    servicePrincipalId: adSp.id,
    value: password.result,
    endDate: "2099-01-01T00:00:00Z",
});

// Generate an SSH key
const sshKey = new tls.PrivateKey("ssh-key", {
    algorithm: "RSA",
    rsaBits: 4096,
});


const config = new pulumi.Config();
const managedClusterName = config.get("managedClusterName") || "azure-nextgen-aks";
const cluster = new containerservice.ManagedCluster("managedClusterResource", {
    resourceGroupName: resourceGroup.name,
    addonProfiles: {
        KubeDashboard: {
            enabled: true,
        },
    },
    agentPoolProfiles: [{
        count: 3,
        maxPods: 110,
        mode: "System",
        name: "agentpool",
        nodeLabels: {},
        osDiskSizeGB: 30,
        osType: "Linux",
        type: "VirtualMachineScaleSets",
        vmSize: "Standard_DS2_v2",
    }],
    dnsPrefix: "azurenextgenprovider",
    enableRBAC: true,
    kubernetesVersion: "1.16.10",
    linuxProfile: {
        adminUsername: "testuser",
        ssh: {
            publicKeys: [{
                keyData: sshKey.publicKeyOpenssh,
            }],
        },
    },
    location: resourceGroup.location,
    nodeResourceGroup: `MC_azure-nextgen-go_${managedClusterName}`,
    resourceName: managedClusterName,
    servicePrincipalProfile: {
        clientId: adApp.applicationId,
        secret: adSpPassword.value,
    },
});

const creds = pulumi.all([cluster.name, resourceGroup.name]).apply(([clusterName, rgName]) => {
    return containerservice.listManagedClusterUserCredentials({
        resourceGroupName: rgName,
        resourceName: clusterName,
    });
});

const encoded = creds.kubeconfigs[0].value;
export const kubeconfig = encoded.apply(enc => Buffer.from(enc, "base64").toString());
