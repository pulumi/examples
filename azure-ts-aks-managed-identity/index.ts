// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.
import * as azure_native from "@pulumi/azure-native";
import * as tls from "@pulumi/tls";

// create a resource group to hold all the resources
const resourceGroup = new azure_native.resources.ResourceGroup("resourceGroup", {});

// create a private key to use for the cluster's ssh key
const privateKey = new tls.PrivateKey("privateKey", {
    algorithm: "RSA",
    rsaBits: 4096,
});

// create a user assigned identity to use for the cluster
const identity = new azure_native.managedidentity.UserAssignedIdentity("identity", { resourceGroupName: resourceGroup.name });

// create the cluster
const cluster = new azure_native.containerservice.ManagedCluster("cluster", {
    resourceGroupName: resourceGroup.name,
    identity: {
        type: azure_native.containerservice.ResourceIdentityType.UserAssigned,
        userAssignedIdentities: [identity.id],
    },
    kubernetesVersion: "1.26.3",
    dnsPrefix: "dns-prefix",
    enableRBAC: true,
    agentPoolProfiles: [{
        name: "agentpool",
        mode: "System",
        count: 1,
        vmSize: "Standard_A2_v2",
        osType: "Linux",
        osDiskSizeGB: 30,
        type: "VirtualMachineScaleSets",
    }],
    linuxProfile: {
        adminUsername: "aksuser",
        ssh: {
            publicKeys: [{
                keyData: privateKey.publicKeyOpenssh,
            }],
        },
    },
});

// retrieve the admin credentials which contain the kubeconfig
const adminCredentials = azure_native.containerservice.listManagedClusterAdminCredentialsOutput({
    resourceGroupName: resourceGroup.name,
    resourceName: cluster.name,
});

// grant the 'contributor' role to the identity on the resource group
const assignment = new azure_native.authorization.RoleAssignment("roleAssignment", {
    principalId: identity.principalId,
    principalType: "ServicePrincipal",
    roleDefinitionId: "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c",
    scope: resourceGroup.id,
});

// export the kubeconfig
export const kubeconfig = adminCredentials.apply(adminCredentials => Buffer.from(adminCredentials.kubeconfigs?.[0]?.value, "base64").toString("utf8"));
