using System;
using System.Threading;
using Pulumi;
using RG = Pulumi.AzureNextGen.Resources.Latest.ResourceGroup;

public static class ResourceGroup
{
    public static Output<string> Name => rg.Value.Name;

    public static Output<string> Location => rg.Value.Location;

    private static Lazy<RG> rg = new Lazy<RG>(
        () => new RG("rg", new()
        {
            ResourceGroupName = "rg",
            Location = "WestUS2",
        }));
}
