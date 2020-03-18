using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using NUnit.Framework;
using Pulumi;
using Pulumi.Azure.AppService;
using Pulumi.Azure.Core;

namespace UnitTesting
{
	/// <summary>
	/// Unit testing examples.
	/// </summary>
	[TestFixture]
	public class ArchiveFunctionAppTests
	{
		[Test]
		public async Task AllDefaults_CreatesConsumptionPlan()
		{
			var resources = await Testing.RunAsync<BasicStack>();
			resources.Length.Should().BeGreaterThan(1);

			var consumptionPlan = resources.OfType<Plan>().FirstOrDefault();
			consumptionPlan.Should().NotBeNull("App Service Plan not found");

			var kind = await consumptionPlan.Kind.GetValueAsync();
			kind.Should().Be("FunctionApp");
		}

		class BasicStack : Stack
		{
			public BasicStack()
			{
				var resourceGroup = new ResourceGroup("testrg");
				var functionApp = new ArchiveFunctionApp("app", new ArchiveFunctionAppArgs
				{
					ResourceGroupName = resourceGroup.Name
				});
			}
		}
	}
}
