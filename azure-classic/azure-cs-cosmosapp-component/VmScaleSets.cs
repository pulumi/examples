// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using System;
using System.IO;
using Pulumi;
using Pulumi.Azure.Compute;
using Pulumi.Azure.Compute.Inputs;
using Pulumi.Azure.Core;
using Pulumi.Azure.Lb;
using Pulumi.Azure.Lb.Inputs;
using Pulumi.Azure.Monitoring;
using Pulumi.Azure.Monitoring.Inputs;
using Pulumi.Azure.Network;

public static class VmScaleSets
{
    public static Output<string> Run()
    {
        // Read a list of target locations from the config file:
        // Expecting a comma-separated list, e.g., "westus,eastus,westeurope"
        var locations = new Config().Require("locations").Split(",");

        var resourceGroup = new ResourceGroup("cosmosvms-rg", new ResourceGroupArgs {Location = locations[0]});

        var vmss = new CosmosApp("vmss", new CosmosAppArgs
        {
            ResourceGroup = resourceGroup,
            Locations = locations,
            DatabaseName = "pricedb",
            ContainerName = "prices",
            Factory = new Builder(resourceGroup).BuildVMScaleSetApp,
        });

        return Output.Format($"{vmss.Endpoint}/cosmos");
    }

    private class Builder
    {
        private ResourceGroup resourceGroup;

        public Builder(ResourceGroup resourceGroup)
        {
            this.resourceGroup = resourceGroup;
        }

        public Func<RegionalContext, IRegionalEndpoint> BuildVMScaleSetApp(GlobalContext context)
        {
            var options =
                CustomResourceOptions.Merge(context.Options, new CustomResourceOptions {DeleteBeforeReplace = true});
            var file = File.ReadAllText("./vm/vmCustomData.yaml");
            return (RegionalContext region) =>
            {
                var location = region.Location;
                var domainName = $"rnddnplm{location}"; //TODO: random

                var publicIp = new PublicIp($"pip-{location}", new PublicIpArgs
                    {
                        ResourceGroupName = resourceGroup.Name,
                        Location = location,
                        AllocationMethod = "Static",
                        DomainNameLabel = domainName,
                    },
                    options);

                var loadBalancer = new LoadBalancer($"lb-{location}", new LoadBalancerArgs
                    {
                        ResourceGroupName = resourceGroup.Name,
                        Location = location,
                        FrontendIpConfigurations =
                        {
                            new LoadBalancerFrontendIpConfigurationArgs
                            {
                                Name = "PublicIPAddress",
                                PublicIpAddressId = publicIp.Id,
                            }
                        }
                    },
                    options);

                var bpepool = new BackendAddressPool($"bap-{location}", new BackendAddressPoolArgs
                    {
                        ResourceGroupName = resourceGroup.Name,
                        LoadbalancerId = loadBalancer.Id,
                    },
                    options);

                var probe = new Probe($"ssh-probe-{location}".Truncate(16), new ProbeArgs
                    {
                        ResourceGroupName = resourceGroup.Name,
                        LoadbalancerId = loadBalancer.Id,
                        Port = 80,
                    },
                    options);

                var rule = new Rule($"rule-{location}", new RuleArgs
                    {
                        ResourceGroupName = resourceGroup.Name,
                        BackendAddressPoolId = bpepool.Id,
                        BackendPort = 80,
                        FrontendIpConfigurationName = "PublicIPAddress",
                        FrontendPort = 80,
                        LoadbalancerId = loadBalancer.Id,
                        ProbeId = probe.Id,
                        Protocol = "Tcp",
                    },
                    options);

                var vnet = new VirtualNetwork($"vnet-{location}", new VirtualNetworkArgs
                    {
                        ResourceGroupName = resourceGroup.Name,
                        Location = location,
                        AddressSpaces = {"10.0.0.0/16"},
                    },
                    options);

                var subnet = new Subnet($"subnet-{location}", new SubnetArgs
                    {
                        ResourceGroupName = resourceGroup.Name,
                        AddressPrefix = "10.0.2.0/24",
                        VirtualNetworkName = vnet.Name,
                    },
                    options);

                var customData = Output.All<string>(context.CosmosAccount.Endpoint,
                        context.CosmosAccount.PrimaryMasterKey, context.Database.Name, context.Container.Name)
                    .Apply(values =>
                    {
                        return file.Replace("${ENDPOINT}", values[0])
                            .Replace("${MASTER_KEY}", values[1])
                            .Replace("${DATABASE}", values[2])
                            .Replace("${COLLECTION}", values[3])
                            .Replace("${LOCATION}", location);
                    });

                var scaleSet = new ScaleSet($"vmss-{location}", new ScaleSetArgs
                    {
                        ResourceGroupName = resourceGroup.Name,
                        Location = location,
                        NetworkProfiles =
                        {
                            new ScaleSetNetworkProfileArgs
                            {
                                IpConfigurations =
                                {
                                    new ScaleSetNetworkProfileIpConfigurationArgs
                                    {
                                        LoadBalancerBackendAddressPoolIds = {bpepool.Id},
                                        Name = "IPConfiguration",
                                        Primary = true,
                                        SubnetId = subnet.Id,
                                    }
                                },
                                Name = "networkprofile",
                                Primary = true,
                            }
                        },
                        OsProfile = new ScaleSetOsProfileArgs
                        {
                            AdminUsername = "neo",
                            AdminPassword = "SEcurePwd$3",
                            ComputerNamePrefix = "lab",
                            CustomData = customData,
                        },
                        OsProfileLinuxConfig = new ScaleSetOsProfileLinuxConfigArgs
                            {DisablePasswordAuthentication = false},
                        Sku = new ScaleSetSkuArgs
                        {
                            Capacity = 1,
                            Name = "Standard_DS1_v2",
                            Tier = "Standard",
                        },
                        StorageProfileDataDisks =
                        {
                            new ScaleSetStorageProfileDataDiskArgs
                            {
                                Caching = "ReadWrite",
                                CreateOption = "Empty",
                                DiskSizeGb = 10,
                                Lun = 0,
                            }
                        },
                        StorageProfileImageReference = new ScaleSetStorageProfileImageReferenceArgs
                        {
                            Offer = "UbuntuServer",
                            Publisher = "Canonical",
                            Sku = "18.04-LTS",
                            Version = "latest",
                        },
                        StorageProfileOsDisk = new ScaleSetStorageProfileOsDiskArgs
                        {
                            Caching = "ReadWrite",
                            CreateOption = "FromImage",
                            ManagedDiskType = "Standard_LRS",
                            Name = "",
                        },
                        UpgradePolicyMode = "Automatic",
                    },
                    CustomResourceOptions.Merge(options, new CustomResourceOptions {DependsOn = {bpepool, rule}}));

                var autoscale = new AutoscaleSetting($"as-{location}", new AutoscaleSettingArgs
                    {
                        ResourceGroupName = resourceGroup.Name,
                        Location = location,
                        Notification = new AutoscaleSettingNotificationArgs
                        {
                            Email = new AutoscaleSettingNotificationEmailArgs
                            {
                                CustomEmails = {"admin@contoso.com"},
                                SendToSubscriptionAdministrator = true,
                                SendToSubscriptionCoAdministrator = true,
                            },
                        },
                        Profiles =
                        {
                            new AutoscaleSettingProfileArgs
                            {
                                Capacity = new AutoscaleSettingProfileCapacityArgs
                                {
                                    Default = 1,
                                    Maximum = 10,
                                    Minimum = 1,
                                },
                                Name = "defaultProfile",
                                Rules =
                                {
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
                                    },
                                }
                            }
                        },
                        TargetResourceId = scaleSet.Id,
                    },
                    options);

                return new AzureEndpoint(publicIp.Id);
            };
        }
    }
}
