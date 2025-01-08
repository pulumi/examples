module Program

open Pulumi.AzureAD
open Pulumi.Azure.Core
open Pulumi.Azure.ContainerService
open Pulumi.Azure.ContainerService.Inputs
open Pulumi.Azure.Network
open Pulumi.Azure.Authorization
open Pulumi.FSharp
open Pulumi.Random
open Pulumi.Tls

[<RequireQualifiedAccess>]
module Helpers =
    let createResourceGroup name = ResourceGroup(name)

    let createPrivateKey name =
        PrivateKey(name,
            PrivateKeyArgs(
                Algorithm = input "RSA",
                RsaBits = input 4096
            ))

    let createApplication name = 
        Application(name,
            ApplicationArgs(DisplayName = input "aks"))

    let createServicePrincipal name (app: Application) =
        ServicePrincipal(name,
            ServicePrincipalArgs(ApplicationId = io app.ApplicationId))

    let createServicePrincipalPassword name  (servicePrincipal: ServicePrincipal) =
        ServicePrincipalPassword(name,
            ServicePrincipalPasswordArgs(
                ServicePrincipalId = io servicePrincipal.Id,
                EndDate = input "2099-01-01T00:00:00Z"
            ))

    let assignNetworkContributorRole name (servicePrincipal: ServicePrincipal) (resourceGroup: ResourceGroup) =
        Assignment(name,
            AssignmentArgs(
                PrincipalId = io servicePrincipal.Id,
                Scope = io resourceGroup.Id,
                RoleDefinitionName = input "Network Contributor"))

    let createVnet name (resourceGroup: ResourceGroup) =
        VirtualNetwork(name,
            VirtualNetworkArgs(
                ResourceGroupName = io resourceGroup.Name,
                AddressSpaces = inputList [ input "10.2.0.0/16" ]
            ))

    let createSubnet name (vnet: VirtualNetwork) (resourceGroup: ResourceGroup) =
        Subnet(name, 
            SubnetArgs(
                ResourceGroupName = io resourceGroup.Name,
                VirtualNetworkName = io vnet.Name,
                AddressPrefixes = inputList [input "10.2.1.0/24"]
            ))

    let createCluster
            name
            (subnet: Subnet)
            (privateKey: PrivateKey)
            (app: Application)
            (servicePrincipalPassword: ServicePrincipalPassword)
            (resourceGroup: ResourceGroup)
            kubernetesVersion
            nodeCount =
        let defaultNodePoolArgs =
            KubernetesClusterDefaultNodePoolArgs(
                Name = input "aksagentpool",
                NodeCount = input nodeCount,
                VmSize = input "Standard_B2s",
                OsDiskSizeGb = input 30,
                VnetSubnetId = io subnet.Id
            )

        let linuxProfileArgs = 
            let keyArgs = KubernetesClusterLinuxProfileSshKeyArgs(KeyData = io privateKey.PublicKeyOpenssh)
            KubernetesClusterLinuxProfileArgs(
                AdminUsername = input "aksuser",
                SshKey = input keyArgs
            )

        let servicePrincipalArgs =
            KubernetesClusterServicePrincipalArgs(
                ClientId = io app.ApplicationId,
                ClientSecret = io servicePrincipalPassword.Value
            )

        let networkProfileArgs =
            KubernetesClusterNetworkProfileArgs(
                NetworkPlugin = input "azure",
                DnsServiceIp = input "10.2.2.254",
                ServiceCidr = input "10.2.2.0/24"
            )

        KubernetesCluster(name,
            KubernetesClusterArgs(
                ResourceGroupName = io resourceGroup.Name,
                DefaultNodePool = input defaultNodePoolArgs,
                DnsPrefix = input "fsaks",
                LinuxProfile = input linuxProfileArgs,
                ServicePrincipal = input servicePrincipalArgs,
                KubernetesVersion = input kubernetesVersion,
                RoleBasedAccessControlEnabled = input true,
                NetworkProfile = input networkProfileArgs
            ))

let infra () =
    let resourceGroup = Helpers.createResourceGroup "fsaks"
    let privateKey = Helpers.createPrivateKey "fsakssshkey"
    let app = Helpers.createApplication "fsaks"
    let servicePrincipal = Helpers.createServicePrincipal "fsakssp" app
    let servicePrincipalPassword = Helpers.createServicePrincipalPassword "fsakssppassword" servicePrincipal
    let networkRole = Helpers.assignNetworkContributorRole "role-assignment" servicePrincipal resourceGroup
    let vnet = Helpers.createVnet "fsaksvnet" resourceGroup
    let subnet = Helpers.createSubnet "fsakssubnet" vnet resourceGroup

    let nodeCount = 3
    let kubernetesVersion = "1.16.4"

    let cluster =
        Helpers.createCluster
            "fsakscluster"
            subnet
            privateKey
            app
            servicePrincipalPassword
            resourceGroup
            kubernetesVersion
            nodeCount

    // Export the kubeconfig string for the storage account
    dict [("kubeconfig", cluster.KubeConfigRaw :> obj)]

[<EntryPoint>]
let main _ =
    Deployment.run infra
