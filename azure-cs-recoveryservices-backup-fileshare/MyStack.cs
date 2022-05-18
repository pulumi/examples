// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

using System;
using System.Threading.Tasks;
using Pulumi;
using AzureNative = Pulumi.AzureNative;
using Resources = Pulumi.AzureNative.Resources;
using Storage = Pulumi.AzureNative.Storage;
using Microsoft.Azure.Management.RecoveryServices.Backup;

class MyStack : Stack
{
    public MyStack()
    {
        var resourceGroup = new Resources.ResourceGroup("resourceGroup");

        var storageAccount = new Storage.StorageAccount("storageaccount", new Storage.StorageAccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            MinimumTlsVersion = Storage.MinimumTlsVersion.TLS1_2,
            Sku = new Storage.Inputs.SkuArgs { Name = Storage.SkuName.Standard_LRS },
            Kind = Storage.Kind.StorageV2,
            EnableHttpsTrafficOnly = true,
            AllowBlobPublicAccess = true,
            AllowSharedKeyAccess = true,
            AccessTier = Storage.AccessTier.Hot,
        });

        //configure soft delete of 7 days on storage account

        new AzureNative.Storage.FileServiceProperties("fileServiceProperties", new AzureNative.Storage.FileServicePropertiesArgs
        {
            AccountName = storageAccount.Name,
            FileServicesName = "default",
            ResourceGroupName = resourceGroup.Name,
            ShareDeleteRetentionPolicy = new Pulumi.AzureNative.Storage.Inputs.DeleteRetentionPolicyArgs
            {
                Days = 7,
                Enabled = true,
            }
        });

        // create a file shared in the storage account
        var fileShare = new Storage.FileShare("samplefileshare", new Storage.FileShareArgs
        {
            ShareName = "samplefileshare", //must be all lower case
            AccessTier = Storage.ShareAccessTier.Hot,
            ShareQuota = 1,
            EnabledProtocols = Storage.EnabledProtocols.SMB,
            ResourceGroupName = resourceGroup.Name,
            AccountName = storageAccount.Name,
        });


        //create recovery services vault
        var recoveryServicesVault = new AzureNative.RecoveryServices.Vault("recoveryServicesVault", new AzureNative.RecoveryServices.VaultArgs
        {
            Identity = new AzureNative.RecoveryServices.Inputs.IdentityDataArgs
            {
                Type = "SystemAssigned",
            },
            Properties = new Pulumi.AzureNative.RecoveryServices.Inputs.VaultPropertiesArgs { },
            ResourceGroupName = resourceGroup.Name,
            Sku = new AzureNative.RecoveryServices.Inputs.SkuArgs
            {
                Name = "Standard",
            },
            VaultName = "recoveryServicesVault",
        });

        // create protection policy. 16 daily, 12 monthly each 1st of the month and 10 annual each 1st of june
        var protectionPolicy = new AzureNative.RecoveryServices.ProtectionPolicy("protectionPolicy", new AzureNative.RecoveryServices.ProtectionPolicyArgs
        {
            PolicyName = "protectionPolicy",
            ResourceGroupName = resourceGroup.Name,
            VaultName = recoveryServicesVault.Name,
            Properties = new AzureNative.RecoveryServices.Inputs.AzureFileShareProtectionPolicyArgs
                {
                    WorkLoadType = AzureNative.RecoveryServices.WorkloadType.AzureFileShare,
                    BackupManagementType = "AzureStorage",
                    SchedulePolicy = new AzureNative.RecoveryServices.Inputs.SimpleSchedulePolicyArgs
                    {
                        SchedulePolicyType = "SimpleSchedulePolicy",
                        ScheduleRunFrequency = "Daily",
                        ScheduleRunTimes = { "2022-05-10T00:00:00Z" },
                        ScheduleWeeklyFrequency = 0,
                    },
                    RetentionPolicy = new AzureNative.RecoveryServices.Inputs.LongTermRetentionPolicyArgs
                    {
                        RetentionPolicyType = "LongTermRetentionPolicy",
                        DailySchedule = new AzureNative.RecoveryServices.Inputs.DailyRetentionScheduleArgs
                        {
                            RetentionTimes = { "2022-05-10T00:00:00Z" },
                            RetentionDuration = new Pulumi.AzureNative.RecoveryServices.Inputs.RetentionDurationArgs
                            {
                                Count = 16,
                                DurationType = "Days"
                            }
                        },
                        MonthlySchedule = new AzureNative.RecoveryServices.Inputs.MonthlyRetentionScheduleArgs
                        {
                            RetentionScheduleFormatType = "Daily",
                            RetentionScheduleDaily = new AzureNative.RecoveryServices.Inputs.DailyRetentionFormatArgs
                            {
                                DaysOfTheMonth = new AzureNative.RecoveryServices.Inputs.DayArgs
                                {
                                    Date = 1,
                                    IsLast = false
                                },
                            },
                            RetentionTimes = { "2022-05-10T00:00:00Z" },
                            RetentionDuration = new AzureNative.RecoveryServices.Inputs.RetentionDurationArgs
                            {
                                Count = 12,
                                DurationType = "Months"
                            }
                        },
                        YearlySchedule = new AzureNative.RecoveryServices.Inputs.YearlyRetentionScheduleArgs
                        {
                            RetentionScheduleFormatType = "Daily",
                            MonthsOfYear = { AzureNative.RecoveryServices.MonthOfYear.June },
                            RetentionScheduleDaily = new AzureNative.RecoveryServices.Inputs.DailyRetentionFormatArgs
                            {
                                DaysOfTheMonth = new AzureNative.RecoveryServices.Inputs.DayArgs
                                {
                                    Date = 1,
                                    IsLast = false
                                }
                            },
                            RetentionTimes = { "2022-05-10T00:00:00Z" },
                            RetentionDuration = new AzureNative.RecoveryServices.Inputs.RetentionDurationArgs
                            {
                                Count = 10,
                                DurationType = "Years"
                            }
                        }
                    },
                    TimeZone = "Eastern Standard Time"
                },
        },
        new CustomResourceOptions { DependsOn = { recoveryServicesVault } });

        // register the storage account with the recovery service vault using a protection container
        var protectionContainer = new AzureNative.RecoveryServices.ProtectionContainer("protectionContainer", new AzureNative.RecoveryServices.ProtectionContainerArgs
        {
            ContainerName = Output.Tuple(resourceGroup.Name.Apply(t => t), storageAccount.Name).Apply(t => $"StorageContainer;storage;{t.Item1};{t.Item2}"), // container name MUST be in the format StorageContainer;storage;RessourceGroupName;StorageAccountName
            FabricName = "Azure",
            Properties = new Pulumi.AzureNative.RecoveryServices.Inputs.AzureStorageContainerArgs
            {
                BackupManagementType = Pulumi.AzureNative.RecoveryServices.BackupManagementType.AzureStorage,
                FriendlyName = storageAccount.Name.Apply(t => t),
                SourceResourceId = storageAccount.Id.Apply(t => t),
                ContainerType = "StorageContainer",
            },
            ResourceGroupName = resourceGroup.Name,
            VaultName = recoveryServicesVault.Name,
        },
        new CustomResourceOptions { DependsOn = { recoveryServicesVault, storageAccount } });

        //backup the fileshare using a protected item
        var protectedItem = new AzureNative.RecoveryServices.ProtectedItem("protectedItem", new AzureNative.RecoveryServices.ProtectedItemArgs
        {
            ContainerName = protectionContainer.Name.Apply(t => t),
            FabricName = "Azure",
            Properties = new Pulumi.AzureNative.RecoveryServices.Inputs.AzureFileshareProtectedItemArgs
            {
                BackupManagementType = Pulumi.AzureNative.RecoveryServices.BackupManagementType.AzureStorage,
                ContainerName = protectionContainer.Name.Apply(t => t),
                FriendlyName = fileShare.Name.Apply(t => t),
                PolicyId = protectionPolicy.Id.Apply(t => t),
                SourceResourceId = storageAccount.Id.Apply(t => t),
                WorkloadType = Pulumi.AzureNative.RecoveryServices.DataSourceType.AzureFileShare,
                ProtectedItemType = "AzureFileShareProtectedItem",
            },
            /*Azure uses a list of pre-built protectable names and you must use them*/
            ProtectedItemName = Output.Tuple(resourceGroup.Name.Apply(t => t), recoveryServicesVault.Name, fileShare.Name)
                            .Apply(names =>
                            {
                                return GetProtectableItemForFileShare(names.Item1, names.Item2, names.Item3);
                            }),
            ResourceGroupName = resourceGroup.Name,
            VaultName = recoveryServicesVault.Name,
        },
        new CustomResourceOptions { DependsOn = { recoveryServicesVault, protectionContainer, fileShare, protectionPolicy, storageAccount } });


    }

    public static async Task<string> GetProtectableItemForFileShare(string resourceGroupName, string vaultName, string fileShareName)
    {
        var azconfig = new Pulumi.Config("azure-native");
        string sub = azconfig.Require("subscriptionId");
        var clientToken = await Pulumi.AzureNative.Authorization.GetClientToken.InvokeAsync();

        var tokenCreds = new Microsoft.Rest.TokenCredentials(clientToken.Token);
        var recoveryServicesBackupClient = new RecoveryServicesBackupClient(tokenCreds);
        recoveryServicesBackupClient.SubscriptionId = sub;

        var protectableObjects = await Microsoft.Azure.Management.RecoveryServices.Backup.BackupProtectableItemsOperationsExtensions.ListAsync(recoveryServicesBackupClient.BackupProtectableItems, vaultName, resourceGroupName, "backupManagementType eq 'AzureStorage'");
        foreach (var protectableObject in protectableObjects)
        {
            if (fileShareName == protectableObject.Properties.FriendlyName)
            {
                return protectableObject.Name;
            }
        }
        return string.Empty;
    }

    /*[Output("serverName")]
    public Output<string> ServerName { get; set; }  */

}
