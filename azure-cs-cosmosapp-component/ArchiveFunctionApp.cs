// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

using System.Collections.Generic;

using Pulumi;
using Pulumi.Azure.AppService;
using Pulumi.Azure.AppService.Inputs;
using Pulumi.Azure.Storage;

public class ArchiveFunctionApp : ComponentResource
{
    public Output<string> AppId { get; private set; } = null!;

    public ArchiveFunctionApp(string name, ArchiveFunctionAppArgs args, ComponentResourceOptions? options = null)
        : base("examples:azure:ArchiveFunctionApp", name, options)
    {
        var opts = new CustomResourceOptions { Parent = this };

        var storageAccount = new Account($"sa{args.Location}", new AccountArgs
        {
            ResourceGroupName = args.ResourceGroupName,
            Location = args.Location,
            AccountReplicationType = "LRS",
            AccountTier = "Standard",
        }, opts);

        var appServicePlan = new Plan($"asp-{args.Location}", new PlanArgs
        {
            ResourceGroupName = args.ResourceGroupName,
            Location = args.Location,
            Kind = "FunctionApp",
            Sku = new PlanSkuArgs
            {
                Tier = "Dynamic",
                Size = "Y1",
            },
        }, opts);

        var container = new Container($"zips-{args.Location}", new ContainerArgs
        {
            StorageAccountName = storageAccount.Name,
            ContainerAccessType = "private",
        }, opts);

        var blob = new Blob($"zip-{args.Location}", new BlobArgs
        {
            StorageAccountName = storageAccount.Name,
            StorageContainerName = container.Name,
            Type = "Block",
            Source = args.Archive,
        }, opts);

        var codeBlobUrl = SharedAccessSignature.SignedBlobReadUrl(blob, storageAccount);

        args.AppSettings.Add("runtime", "dotnet");
        args.AppSettings.Add("WEBSITE_RUN_FROM_PACKAGE", codeBlobUrl);

        var app = new FunctionApp($"app-{args.Location}", new FunctionAppArgs
        {
            ResourceGroupName = args.ResourceGroupName,
            Location = args.Location,
            AppServicePlanId = appServicePlan.Id,
            AppSettings = args.AppSettings,
            StorageConnectionString = storageAccount.PrimaryConnectionString,
            Version = "~2",
        }, opts);

        this.AppId = app.Id;
    }
}

public class ArchiveFunctionAppArgs
{
    public Input<string> ResourceGroupName { get; set; } = null!;
    public string Location { get; set; } = null!;
    public Input<AssetOrArchive> Archive { get; set; } = null!;
    
    private InputMap<string>? _appSettings;
    public InputMap<string> AppSettings
    {
        get => _appSettings ?? (_appSettings = new InputMap<string>());
        set => _appSettings = value;
    }
}
