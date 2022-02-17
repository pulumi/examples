// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

using System;
using System.Threading.Tasks;
using Pulumi;
using AzureNative = Pulumi.AzureNative;
using Resources = Pulumi.AzureNative.Resources;
using Sql = Pulumi.AzureNative.Sql;
using Pulumi.Random;

class MyStack : Stack
{
    public MyStack()
    {
        var resourceGroup = new Resources.ResourceGroup("resourceGroup");

        var password = new Pulumi.Random.RandomPassword("admin-password", new Pulumi.Random.RandomPasswordArgs { Length = 20 });

        Sql.Server server = new Sql.Server(
            "server",
            new Sql.ServerArgs
            {
                AdministratorLogin = "admin-user",
                AdministratorLoginPassword = password.Result,
                ResourceGroupName = resourceGroup.Name,
                ServerName = $"{Pulumi.Deployment.Instance.StackName}",
                MinimalTlsVersion = "1.2",
                PublicNetworkAccess = "Enabled"
            });

            this.ServerName = server.Name.Apply(servername => $"{servername}.database.windows.net");

            Sql.Database database = new Sql.Database(
            "db",
            new Sql.DatabaseArgs
            {
                DatabaseName = "database",
                ServerName = server.Name,
                Collation = "SQL_Latin1_General_CP1_CI_AI",
                ResourceGroupName = resourceGroup.Name,
                Sku = new AzureNative.Sql.Inputs.SkuArgs
                    {
                        Capacity = 2,
                        Family = "Gen5",
                        Name = "GP_S", /*Serverless*/
                    }
            });

        var vnet = new AzureNative.Network.VirtualNetwork("my-network", new AzureNative.Network.VirtualNetworkArgs
        {
            VirtualNetworkName = "my-network",
            ResourceGroupName = resourceGroup.Name,
            AddressSpace = new AzureNative.Network.Inputs.AddressSpaceArgs
            {
                AddressPrefixes = new[] { "10.0.0.0/8" }
            }
        });

        var subnet = new AzureNative.Network.Subnet("my-subnet", new AzureNative.Network.SubnetArgs
        {
            Name = "my-subnet",
            ResourceGroupName = resourceGroup.Name,
            VirtualNetworkName = vnet.Name,
            AddressPrefix = "10.0.0.0/16",
            PrivateEndpointNetworkPolicies = "Disabled"
        });

        string privateEndpointName = "SQLServer-PrivateEndpoint";
        var privateEndpoint = new AzureNative.Network.PrivateEndpoint(privateEndpointName, new AzureNative.Network.PrivateEndpointArgs
        {
            ResourceGroupName = resourceGroup.Name,
            PrivateEndpointName = privateEndpointName,
            PrivateLinkServiceConnections =
            {
                new AzureNative.Network.Inputs.PrivateLinkServiceConnectionArgs
                {
                    GroupIds =
                    {
                        "sqlServer",
                    },
                    Name = $"{privateEndpointName}-PrivateLinkServiceConnection",
                    PrivateLinkServiceId = server.Id,
                },
            },
            Subnet = new AzureNative.Network.Inputs.SubnetArgs
            {
                Id = subnet.Id,
            },
        });

        var privateZone = new AzureNative.Network.PrivateZone($"sqlserver-privateZone", new AzureNative.Network.PrivateZoneArgs
        {
            PrivateZoneName = server.Name.Apply(servername => servername + ".database.windows.net"),
            ResourceGroupName = resourceGroup.Name,
            Location = "global",
        });

        var privateRecordSet = new AzureNative.Network.PrivateRecordSet($"sqlserver-rivateRecordSet", new AzureNative.Network.PrivateRecordSetArgs
        {
            ARecords =
            {
                new AzureNative.Network.Inputs.ARecordArgs
                {
                    Ipv4Address = Output.Tuple(resourceGroup.Name, privateEndpoint.Name)
                            .Apply(names =>
                            {
                                return GetPrivateEndpointIP(names.Item1, names.Item2);
                            }),
                },
            },
            PrivateZoneName = privateZone.Name,
            RecordType = "A",
            RelativeRecordSetName = "@",
            ResourceGroupName = resourceGroup.Name,
            Ttl = 3600,
        });

        string virtualNetworkLinkName = $"sqlserver-VirtualNetworkLink";
        var virtualNetworkLink = new AzureNative.Network.VirtualNetworkLink(virtualNetworkLinkName, new AzureNative.Network.VirtualNetworkLinkArgs
        {
            PrivateZoneName = privateZone.Name,
            ResourceGroupName = resourceGroup.Name,
            RegistrationEnabled = false,
            Location = "global",
            VirtualNetwork = new AzureNative.Network.Inputs.SubResourceArgs
            {
                Id = vnet.Id,
            },
            VirtualNetworkLinkName = virtualNetworkLinkName
        });

        var privateDnsZoneGroup = new AzureNative.Network.PrivateDnsZoneGroup($"sqlserver-PrivateDnsZoneGroup", new AzureNative.Network.PrivateDnsZoneGroupArgs
        {
            PrivateDnsZoneConfigs =
            {
                new AzureNative.Network.Inputs.PrivateDnsZoneConfigArgs
                {
                    Name = privateZone.Name,
                    PrivateDnsZoneId = privateZone.Id,
                },
            },
            PrivateDnsZoneGroupName = privateEndpoint.Name,
            PrivateEndpointName = privateEndpoint.Name,
            ResourceGroupName = resourceGroup.Name,
        });

    }

    public static async Task<string> GetPrivateEndpointIP(string resourceGroupName, string privateEndpointName)
    {
        /* Azure api does not fill out the Name property of the NetworkInterfaces object nor does it expand to load the PrivateIPAddress under NetworkInterfaces.
         Azure api only fill out the Id property of the NetworkInterfaces object
        In order to get the PrivateIPAddress we need to call GetNetworkInterface.. which requires the NetworkInterface Name
        Thus we need to derived the NetworkInterfaces Name from its Id
        */
        Pulumi.Log.Debug("GetPrivateEndpointIP for " + privateEndpointName);
        var privateEndpoint = await AzureNative.Network.GetPrivateEndpoint.InvokeAsync(new AzureNative.Network.GetPrivateEndpointArgs
        {
            PrivateEndpointName = privateEndpointName,
            ResourceGroupName = resourceGroupName,
        });
        string nicName = privateEndpoint.NetworkInterfaces[0].Id!;
        nicName = nicName.Remove(0, nicName.LastIndexOf(@"/") + 1);
        if (privateEndpoint != null && nicName != string.Empty)
        {
            var nic = await AzureNative.Network.GetNetworkInterface.InvokeAsync(new AzureNative.Network.GetNetworkInterfaceArgs
            {
                NetworkInterfaceName = nicName,
                ResourceGroupName = resourceGroupName,
                Expand = "true",
            });
            if (nic != null && nic.IpConfigurations != null)
            {
                return nic.IpConfigurations[0].PrivateIPAddress!;
            }
        }
        return string.Empty;
    }

    [Output("serverName")]
    public Output<string> ServerName { get; set; }

}
