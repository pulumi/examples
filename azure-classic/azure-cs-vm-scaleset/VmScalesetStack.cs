// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Azure.Compute;
using Pulumi.Azure.Compute.Inputs;
using Pulumi.Azure.Core;
using Pulumi.Azure.Network;
using Pulumi.Azure.Network.Inputs;
using Pulumi.Azure.Lb;
using Pulumi.Azure.Lb.Outputs;
using Pulumi.Azure.Lb.Inputs;
using System.Collections.Generic;
using Pulumi.Azure.Monitoring;
using Pulumi.Azure.Monitoring.Inputs;

class VmScalesetStack : Stack
{
    public VmScalesetStack()
    {
        var applicationPort = 80;
        var resourceGroup = new ResourceGroup("vmss-rg");

        var network = new VirtualNetwork("vnet",
            new VirtualNetworkArgs
            {
                ResourceGroupName = resourceGroup.Name,
                AddressSpaces = { "10.0.0.0/16" }
            }
        );

        var subnet = new Subnet("subnet", 
            new SubnetArgs
            {
                ResourceGroupName = resourceGroup.Name,
                Name = "default",
                AddressPrefixes = "10.0.1.0/24",
                VirtualNetworkName = network.Name
            });

        var publicIp = new PublicIp("public-ip",
            new PublicIpArgs
            {
                ResourceGroupName = resourceGroup.Name,
                AllocationMethod = "Dynamic"
            });

        var lb = new LoadBalancer("lb",
            new LoadBalancerArgs
            {
                ResourceGroupName = resourceGroup.Name,
                FrontendIpConfigurations = new List<LoadBalancerFrontendIpConfigurationArgs>
                {
                    new LoadBalancerFrontendIpConfigurationArgs
                    {
                        Name = "PublicIPAddress",
                        PublicIpAddressId = publicIp.Id
                    }
                }
            });

        var bpePool = new BackendAddressPool("bpepool",
            new BackendAddressPoolArgs
            {
                ResourceGroupName = resourceGroup.Name,
                LoadbalancerId = lb.Id,
            });

        var sshProbe = new Probe("ssh-probe",
            new ProbeArgs
            {
                ResourceGroupName = resourceGroup.Name,
                LoadbalancerId = lb.Id,
                Port = applicationPort,
            });

        var natRule = new Rule("lbnatrule-http",
            new RuleArgs
            {
                ResourceGroupName = resourceGroup.Name,
                BackendAddressPoolId = bpePool.Id,
                BackendPort = applicationPort,
                FrontendIpConfigurationName = "PublicIPAddress",
                FrontendPort = applicationPort,
                LoadbalancerId = lb.Id,
                ProbeId = sshProbe.Id,
                Protocol = "Tcp",
            });

        var scaleSet = new ScaleSet("vmscaleset",
            new ScaleSetArgs
            {
                ResourceGroupName = resourceGroup.Name,
                NetworkProfiles = new ScaleSetNetworkProfileArgs
                {
                    IpConfigurations = new ScaleSetNetworkProfileIpConfigurationArgs[] {
                        new ScaleSetNetworkProfileIpConfigurationArgs {
                            LoadBalancerBackendAddressPoolIds = bpePool.Id,
                            Name = "IPConfiguration",
                            Primary = true,
                            SubnetId = subnet.Id,
                        }
                    },
                    Name = "networkprofile",
                    Primary = true
                },
                OsProfile = new ScaleSetOsProfileArgs
                {
                    ComputerNamePrefix = "vmlab",
                    AdminUsername = "testadmin",
                    AdminPassword = "Password1234!",
                    CustomData =
                        @"#!/bin/bash
echo ""Hello, World by $HOSTNAME!"" > index.html
nohup python -m SimpleHTTPServer 80 &"
                },
                OsProfileLinuxConfig = new ScaleSetOsProfileLinuxConfigArgs
                {
                    DisablePasswordAuthentication = false
                },
                Sku = new ScaleSetSkuArgs
                {
                    Capacity = 1,
                    Name = "Standard_DS1_v2",
                    Tier = "Standard",
                },
                StorageProfileOsDisk = new ScaleSetStorageProfileOsDiskArgs
                {
                    Caching = "ReadWrite",
                    CreateOption = "FromImage",
                    ManagedDiskType = "Standard_LRS",
                    Name = ""
                },
                StorageProfileDataDisks = new ScaleSetStorageProfileDataDiskArgs
                {
                    Caching = "ReadWrite",
                    CreateOption = "Empty",
                    DiskSizeGb = 10,
                    Lun = 0
                },
                StorageProfileImageReference = new ScaleSetStorageProfileImageReferenceArgs
                {
                    Offer = "UbuntuServer",
                    Publisher = "Canonical",
                    Sku = "16.04-LTS",
                    Version = "latest",
                },
                UpgradePolicyMode = "Manual"

            }, new CustomResourceOptions { DeleteBeforeReplace = true, DependsOn = bpePool });


        var autoscale = new AutoscaleSetting("vmss-autoscale",
            new AutoscaleSettingArgs
            {
                ResourceGroupName = resourceGroup.Name,
                Notification = new AutoscaleSettingNotificationArgs
                {
                    Email = new AutoscaleSettingNotificationEmailArgs
                    {
                        CustomEmails = new string[] { "admin@contoso.com" },
                        SendToSubscriptionAdministrator = true,
                        SendToSubscriptionCoAdministrator = true,
                    },
                },
                Profiles = new AutoscaleSettingProfileArgs[] {
                    new AutoscaleSettingProfileArgs {
                        Capacity = new AutoscaleSettingProfileCapacityArgs
                        {
                            Default = 2,
                            Maximum = 10,
                            Minimum = 2,
                        },
                        Name = "defaultProfile",
                        Rules = new AutoscaleSettingProfileRuleArgs[] {
                            new AutoscaleSettingProfileRuleArgs
                            {
                                MetricTrigger = new AutoscaleSettingProfileRuleMetricTriggerArgs
                                {
                                    MetricName = "Percentage CPU",
                                    MetricResourceId = scaleSet.Id,
                                    Operator = "GreaterThan",
                                    Statistic = "Average",
                                    Threshold = 75,
                                    TimeAggregation = "Average",
                                    TimeGrain = "PT1M",
                                    TimeWindow = "PT5M",
                                },
                                ScaleAction = new AutoscaleSettingProfileRuleScaleActionArgs
                                {
                                    Cooldown = "PT1M",
                                    Direction = "Increase",
                                    Type = "ChangeCount",
                                    Value = 1,
                                },
                            },
                            new AutoscaleSettingProfileRuleArgs
                            {
                                MetricTrigger = new AutoscaleSettingProfileRuleMetricTriggerArgs
                                {
                                    MetricName = "Percentage CPU",
                                    MetricResourceId = scaleSet.Id,
                                    Operator = "LessThan",
                                    Statistic = "Average",
                                    Threshold = 25,
                                    TimeAggregation = "Average",
                                    TimeGrain = "PT1M",
                                    TimeWindow = "PT5M",
                                },
                                ScaleAction = new AutoscaleSettingProfileRuleScaleActionArgs
                                {
                                    Cooldown = "PT1M",
                                    Direction = "Decrease",
                                    Type = "ChangeCount",
                                    Value = 1,
                                },

                            }
                        }
                    }
                },
                TargetResourceId = scaleSet.Id
            });
            
                

        // The public IP address is not allocated until the VM is running, so wait for that
        // resource to create, and then lookup the IP address again to report its public IP.
        this.IpAddress = Output
            .Tuple<string, string, string>(scaleSet.Id, publicIp.Name, resourceGroup.Name)
            .Apply<string>(async t =>
            {
                (_, string name, string resourceGroupName) = t;
                var ip = await GetPublicIP.InvokeAsync(new GetPublicIPArgs
                    {Name = name, ResourceGroupName = resourceGroupName});
                return ip.IpAddress;
            });
    }

    [Output] public Output<string> IpAddress { get; set; }
}
