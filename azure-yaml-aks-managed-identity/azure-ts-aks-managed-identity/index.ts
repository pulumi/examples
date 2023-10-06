import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";
import * as tls from "@pulumi/tls";

const resourceGroup = new azure_native.resources.ResourceGroup("resourceGroup", {});
const privateKey = new tls.PrivateKey("privateKey", {
    algorithm: "RSA",
    rsaBits: 4096,
});
const identity = new azure_native.managedidentity.UserAssignedIdentity("identity", {resourceGroupName: resourceGroup.name});
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
const adminCredentials = azure_native.containerservice.listManagedClusterAdminCredentialsOutput({
    resourceGroupName: resourceGroup.name,
    resourceName: cluster.name,
});
const roleAssignment = new azure_native.authorization.RoleAssignment("roleAssignment", {
    principalId: identity.principalId,
    principalType: "ServicePrincipal",
    roleDefinitionId: "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c",
    scope: resourceGroup.id,
});
export const kubeconfig = adminCredentials.apply(adminCredentials => Buffer.from(adminCredentials.kubeconfigs?.[0]?.value, "base64").toString("utf8"));
