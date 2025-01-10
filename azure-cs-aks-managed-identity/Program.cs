// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.
using System;
using System.Collections.Generic;
using System.Linq;
using Pulumi;
using AzureNative = Pulumi.AzureNative;
using Tls = Pulumi.Tls;

return await Deployment.RunAsync(() => 
{
    // create a resource group to hold all the resources
    var resourceGroup = new AzureNative.Resources.ResourceGroup("resourceGroup");

    // create a private key to use for the cluster's ssh key
    var privateKey = new Tls.PrivateKey("privateKey", new()
    {
        Algorithm = "RSA",
        RsaBits = 4096,
    });

    // create a user assigned identity to use for the cluster
    var identity = new AzureNative.ManagedIdentity.UserAssignedIdentity("identity", new()
    {
        ResourceGroupName = resourceGroup.Name,
    });

    // create the cluster
    var cluster = new AzureNative.ContainerService.ManagedCluster("cluster", new()
    {
        ResourceGroupName = resourceGroup.Name,
        Identity = new AzureNative.ContainerService.Inputs.ManagedClusterIdentityArgs
        {
            Type = AzureNative.ContainerService.ResourceIdentityType.UserAssigned,
            UserAssignedIdentities = new[]
            {
                identity.Id,
            },
        },
        KubernetesVersion = "1.26.3",
        DnsPrefix = "dns-prefix",
        EnableRBAC = true,
        AgentPoolProfiles = new[]
        {
            new AzureNative.ContainerService.Inputs.ManagedClusterAgentPoolProfileArgs
            {
                Name = "agentpool",
                Mode = "System",
                Count = 1,
                VmSize = "Standard_A2_v2",
                OsType = "Linux",
                OsDiskSizeGB = 30,
                Type = "VirtualMachineScaleSets",
            },
        },
        LinuxProfile = new AzureNative.ContainerService.Inputs.ContainerServiceLinuxProfileArgs
        {
            AdminUsername = "aksuser",
            Ssh = new AzureNative.ContainerService.Inputs.ContainerServiceSshConfigurationArgs
            {
                PublicKeys = new[]
                {
                    new AzureNative.ContainerService.Inputs.ContainerServiceSshPublicKeyArgs
                    {
                        KeyData = privateKey.PublicKeyOpenssh,
                    },
                },
            },
        },
    });

    // retrieve the admin credentials which contain the kubeconfig
    var adminCredentials = AzureNative.ContainerService.ListManagedClusterAdminCredentials.Invoke(new()
    {
        ResourceGroupName = resourceGroup.Name,
        ResourceName = cluster.Name,
    });

    // grant the 'contributor' role to the identity on the resource group
    new AzureNative.Authorization.RoleAssignment("roleAssignment", new()
    {
        PrincipalId = identity.PrincipalId,
        PrincipalType = "ServicePrincipal",
        RoleDefinitionId = "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c",
        Scope = resourceGroup.Id,
    });

    // export the kubeconfig
    return new Dictionary<string, object?>
    {
        ["kubeconfig"] = adminCredentials.Apply(creds => System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(creds.Kubeconfigs.First().Value))),
    };
});

