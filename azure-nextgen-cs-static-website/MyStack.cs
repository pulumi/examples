using System;
using Pulumi;
using AzureNextGen = Pulumi.AzureNextGen;
using Cdn = Pulumi.AzureNextGen.Cdn.Latest;
using Resources = Pulumi.AzureNextGen.Resources.Latest;
using Storage = Pulumi.AzureNextGen.Storage.Latest;
using Pulumi.Random;

class MyStack : Stack
{
    public MyStack()
    {
        // TODO: Remove after autonaming support is added.
        var randomSuffix = new RandomString("randomSuffix", new RandomStringArgs
        {
            Length = 10,
            Special = false,
            Upper = false,
        });

        var config = new Config();
        var storageAccountName = config.Get("storageAccountName") != null ? Output.Create(config.Get("storageAccountName")!) : randomSuffix.Result.Apply(result => $"site{result}");
        var cdnEndpointName = config.Get("cdnEndpointName") != null ? Output.Create(config.Get("cdnEndpointName")!) : storageAccountName.Apply(result => $"cdn-endpnt-{result}");
        var cdnProfileName = config.Get("cdnProfileName") != null ? Output.Create(config.Get("cdnProfileName")!) : storageAccountName.Apply(result => $"cdn-profile-{result}");

        var resourceGroup = new Resources.ResourceGroup("resourceGroup", new Resources.ResourceGroupArgs
        {
            ResourceGroupName = randomSuffix.Result.Apply(result => $"rg{result}"),
        });

        var profile = new Cdn.Profile("profile", new Cdn.ProfileArgs
        {
            ProfileName = cdnProfileName,
            ResourceGroupName = resourceGroup.Name,
            Sku = new Cdn.Inputs.SkuArgs
            {
                Name = Cdn.SkuName.Standard_Microsoft,
            },
        });

        var storageAccount = new Storage.StorageAccount("storageAccount", new Storage.StorageAccountArgs
        {
            AccessTier = Storage.AccessTier.Hot,
            AccountName = storageAccountName,
            EnableHttpsTrafficOnly = true,
            Encryption = new Storage.Inputs.EncryptionArgs
            {
                KeySource = Storage.KeySource.Microsoft_Storage,
                Services = new Storage.Inputs.EncryptionServicesArgs
                {
                    Blob = new Storage.Inputs.EncryptionServiceArgs
                    {
                        Enabled = true,
                    },
                    File = new Storage.Inputs.EncryptionServiceArgs
                    {
                        Enabled = true,
                    },
                },
            },
            Kind = Storage.Kind.StorageV2,
            NetworkRuleSet = new Storage.Inputs.NetworkRuleSetArgs
            {
                Bypass = Storage.Bypass.AzureServices,
                DefaultAction = Storage.DefaultAction.Allow,
            },
            ResourceGroupName = resourceGroup.Name,
            Sku = new Storage.Inputs.SkuArgs
            {
                Name = Storage.SkuName.Standard_LRS,
            },
        });

        var endpointOrigin = storageAccount.PrimaryEndpoints.Apply(pe => pe.Web.Replace("https://", "").Replace("/", ""));

        var endpoint = new Cdn.Endpoint("endpoint", new Cdn.EndpointArgs
        {
            ContentTypesToCompress = { },
            EndpointName = cdnEndpointName,
            IsCompressionEnabled = false,
            IsHttpAllowed = false,
            IsHttpsAllowed = true,
            OriginHostHeader = endpointOrigin,
            Origins =
            {
                new Cdn.Inputs.DeepCreatedOriginArgs
                {
                    HostName = endpointOrigin,
                    HttpsPort = 443,
                    Name = Output.Tuple(randomSuffix.Result, cdnEndpointName).Apply(t => $"{t.Item2}-origin-{t.Item1}"),
                },
            },
            ProfileName = profile.Name,
            QueryStringCachingBehavior = Cdn.QueryStringCachingBehavior.NotSet,
            ResourceGroupName = resourceGroup.Name,
        });

        // Enable static website support
        var staticWebsite = new Storage.StorageAccountStaticWebsite("staticWebsite", new Storage.StorageAccountStaticWebsiteArgs
        {
            AccountName = storageAccount.Name,
            ResourceGroupName = resourceGroup.Name,
            IndexDocument = "index.html",
            Error404Document = "404.html",
        });

        var index_html = new Storage.Blob("index_html", new Storage.BlobArgs
        {
            BlobName = "index.html",
            ResourceGroupName = resourceGroup.Name,
            AccountName = storageAccount.Name,
            ContainerName = staticWebsite.ContainerName,
            Type = Storage.BlobType.Block,
            Source = new FileAsset("./wwwroot/index.html"),
            ContentType = "text/html",
        });
        var notfound_html = new Storage.Blob("notfound_html", new Storage.BlobArgs
        {
            BlobName = "404.html",
            ResourceGroupName = resourceGroup.Name,
            AccountName = storageAccount.Name,
            ContainerName = staticWebsite.ContainerName,
            Type = Storage.BlobType.Block,
            Source = new FileAsset("./wwwroot/404.html"),
            ContentType = "text/html",
        });

        // Web endpoint to the website
        this.StaticEndpoint = storageAccount.PrimaryEndpoints.Apply(primaryEndpoints => primaryEndpoints.Web);

        // CDN endpoint to the website.
        // Allow it some time after the deployment to get ready.
        this.CdnEndpoint = endpoint.HostName.Apply(hostName => $"https://{hostName}");
    }

    [Output("staticEndpoint")]
    public Output<string> StaticEndpoint { get; set; }
    [Output("cdnEndpoint")]
    public Output<string> CdnEndpoint { get; set; }
}
