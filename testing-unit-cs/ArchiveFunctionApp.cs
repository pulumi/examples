// Copyright 2016-2020, Pulumi Corporation

using Pulumi;
using Pulumi.Azure.AppService;
using Pulumi.Azure.AppService.Inputs;
using Pulumi.Azure.Storage;

/// <summary>
/// A simple component to be tested.
/// </summary>
public class ArchiveFunctionApp : ComponentResource
{
    public ArchiveFunctionApp(string name, ArchiveFunctionAppArgs args, ComponentResourceOptions? options = null)
        : base("examples:azure:ArchiveFunctionApp", name, options)
    {
        var opts = new CustomResourceOptions { Parent = this };

        var storageAccount = new Account("sa", new AccountArgs
        {
            ResourceGroupName = args.ResourceGroupName,
            AccountReplicationType = "LRS",
            AccountTier = "Standard",
        }, opts);

        var appServicePlan = new Plan("asp", new PlanArgs
        {
            ResourceGroupName = args.ResourceGroupName,
            Kind = "FunctionApp",
            Sku = new PlanSkuArgs
            {
                Tier = "Dynamic",
                Size = "Y1",
            },
        }, opts);

        var container = new Container("zips", new ContainerArgs
        {
            StorageAccountName = storageAccount.Name,
            ContainerAccessType = "private",
        }, opts);

        var blob = new Blob("zip", new BlobArgs
        {
            StorageAccountName = storageAccount.Name,
            StorageContainerName = container.Name,
            Type = "Block",
            Source = args.Archive
        }, opts);

        var codeBlobUrl = SharedAccessSignature.SignedBlobReadUrl(blob, storageAccount);

        var app = new FunctionApp("app", new FunctionAppArgs
        {
            ResourceGroupName = args.ResourceGroupName,
            AppServicePlanId = appServicePlan.Id,
            AppSettings =
            {
	            {"runtime", "dotnet"},
	            {"WEBSITE_RUN_FROM_PACKAGE", codeBlobUrl},
            },
            StorageConnectionString = storageAccount.PrimaryConnectionString,
            Version = "~2"
        }, opts);
    }
}

public enum Runtime
{
	DotNet,
	NodeJS,
	Python
}

public class ArchiveFunctionAppArgs
{
    public Input<string> ResourceGroupName { get; set; } = null!;
    public Input<AssetOrArchive> Archive { get; set; } = null!;
    public Input<Runtime> Runtime { get; set; } = null!;
}
