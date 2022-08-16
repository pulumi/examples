namespace Tests;

using System.Collections.Immutable;
using FluentAssertions;
using Pulumi;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.Storage;
using Pulumi.Testing;

public class InfraTests
{
    class TestStack : Stack
    {
        public TestStack()
        {
            Outputs = Deploy.Infra();
        }

        public Dictionary<string, object?> Outputs { get; set; }
    }

    private static Task<ImmutableArray<Pulumi.Resource>> TestAsync()
	{
        return Pulumi.Deployment.TestAsync<TestStack>(new Mocks(), new TestOptions 
        {
            IsPreview = false
        });
    }

    [Test]
	public async Task SingleResourceGroupExists()
	{
		var resources = await TestAsync();
		var resourceGroups = resources.OfType<ResourceGroup>().ToList();
		resourceGroups.Count.Should().Be(1, "a single resource group is expected");
	}

	[Test]
	public async Task ResourceGroupHasEnvironmentTag()
	{
		var resources = await TestAsync();
		var resourceGroup = resources.OfType<ResourceGroup>().First();
	
		var tags = await resourceGroup.Tags.GetValueAsync();
		tags.Should().NotBeNull("Tags must be defined");
		tags.Should().ContainKey("Environment");
	}
	
	[Test]
	public async Task StorageAccountExists()
	{
		var resources = await TestAsync();
		var storageAccounts = resources.OfType<StorageAccount>();
		var storageAccount = storageAccounts.SingleOrDefault();
		storageAccount.Should().NotBeNull("Storage account not found");
	}
	
	[Test]
	public async Task UploadsTwoFiles()
	{
		var resources = await TestAsync();
		var files = resources.OfType<Blob>().ToList();
		files.Count.Should().Be(2, "Should have uploaded files from `wwwroot`");
	}
	
	[Test]
	public async Task StackExportsWebsiteUrl()
	{
		var resources = await TestAsync();
		var stack = resources.OfType<TestStack>().First();
		Assert.That(stack.Outputs.ContainsKey("endpoint"), "Stack should have an endpoint output");
        if (stack.Outputs["endpoint"] is Output<string> endpoint)
        {
            var endpointValue = await endpoint.GetValueAsync();
		    endpointValue.Should().Be("https://wwwprodsa.web.core.windows.net");
        }
	}
}