// Copyright 2016-2020, Pulumi Corporation

using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using NUnit.Framework;
using Pulumi;
using Pulumi.Azure.Core;
using Pulumi.Testing;
using Storage = Pulumi.Azure.Storage;

namespace UnitTesting
{
	/// <summary>
	/// Unit testing examples.
	/// </summary>
	[TestFixture]
	public class WebserverStackTests
	{
		private static Task<ImmutableArray<Resource>> TestAsync()
		{
			return Deployment.TestAsync<WebsiteStack>(new Mocks(), new TestOptions {IsPreview = false});
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
		public async Task StorageAccountBelongsToResourceGroup()
		{
			var resources = await TestAsync();
			var storageAccount = resources.OfType<Storage.Account>().SingleOrDefault();
			storageAccount.Should().NotBeNull("Storage account not found");
			
			var resourceGroupName = await storageAccount.ResourceGroupName.GetValueAsync();
			resourceGroupName.Should().Be("www-prod-rg");
		}
		
		[Test]
		public async Task UploadsTwoFiles()
		{
			var resources = await TestAsync();
			var files = resources.OfType<Storage.Blob>().ToList();
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
