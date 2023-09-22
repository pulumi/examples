import { resources, managedidentity, authorization, containerservice } from "@pulumi/azure-native";
import { PrivateKey } from "@pulumi/tls";

// Create a Private Key for SSH access
const key = new PrivateKey("privateKey", {
    algorithm: "RSA",
    rsaBits: 4096,
});

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("resourceGroup");

// Create an Azure Managed Identity
const identity = new managedidentity.UserAssignedIdentity("identity", {
    resourceGroupName: resourceGroup.name,
});

// Assign role to the Managed Identity
new authorization.RoleAssignment("roleAssignment", {
    principalId: identity.principalId,
    principalType: "ServicePrincipal",
    roleDefinitionId: "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c",
    scope: resourceGroup.id,
});

// Create an Azure Kubernetes Cluster using the Managed Identity
const aksCluster = new containerservice.ManagedCluster("aksCluster", {
    resourceGroupName: resourceGroup.name,
    identity: {
        type: "UserAssigned",
        userAssignedIdentities: [
            identity.id,
        ],
    },
    kubernetesVersion: "1.26.3",
    dnsPrefix: "dns-prefix",
    enableRBAC: true,
    agentPoolProfiles: [{
        name: "agentpool",
        mode: "System",
        count: 2,
        vmSize: "Standard_A2_v2",
        osType: "Linux",
        osDiskSizeGB: 30,
        type: "VirtualMachineScaleSets",
    }],
    linuxProfile: {
        adminUsername: "aksUser",
        ssh: {
            publicKeys: [{
                keyData: key.publicKeyOpenssh,
            }],
        }
    }
});

const credentials = containerservice.listManagedClusterAdminCredentialsOutput({
    resourceGroupName: resourceGroup.name,
    resourceName: aksCluster.name,
});

// Export the Kubernetes config
export const kubeconfig = credentials.kubeconfigs[0].value.apply((config) =>
    Buffer.from(config, "base64").toString()
);;
