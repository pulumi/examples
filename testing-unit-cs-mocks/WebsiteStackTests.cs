// Copyright 2016-2020, Pulumi Corporation

using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using NUnit.Framework;
using Pulumi;
using Pulumi.Testing;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.Storage;

namespace UnitTesting
{
	/// <summary>
	/// Unit testing examples.
	/// </summary>
	[TestFixture]
	public class WebsiteStackTests
	{
		private static Task<ImmutableArray<Pulumi.Resource>> TestAsync()
		{
			return Pulumi.Deployment.TestAsync<WebsiteStack>(new Mocks(), new TestOptions {IsPreview = false});
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
			var stack = resources.OfType<WebsiteStack>().First();
			
			var endpoint = await stack.Endpoint.GetValueAsync();
			endpoint.Should().Be("https://wwwprodsa.web.core.windows.net");
		}
	}
}
