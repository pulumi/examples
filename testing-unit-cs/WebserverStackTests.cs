using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using NUnit.Framework;
using Pulumi.Aws.Ec2;

namespace UnitTesting
{
	/// <summary>
	/// Unit testing examples.
	/// </summary>
	[TestFixture]
	public class WebserverStackTests
	{
		[Test]
		public async Task InstanceHasNameTag()
		{
			var resources = await Testing.RunAsync<WebserverStack>();

			var instance = resources.OfType<Instance>().FirstOrDefault();
			instance.Should().NotBeNull("EC2 Instance not found");

			var tags = await instance.Tags.GetValueAsync();
			tags.Should().NotBeNull("Tags are not defined");
			tags.Should().ContainKey("Name");
		}
		
		[Test]
		public async Task InstanceMustNotUseInlineUserData()
		{
			var resources = await Testing.RunAsync<WebserverStack>();

			var instance = resources.OfType<Instance>().FirstOrDefault();
			instance.Should().NotBeNull("EC2 Instance not found");

			var tags = await instance.UserData.GetValueAsync();
			tags.Should().BeNull();
		}
		
		[Test]
		public async Task SecurityGroupMustNotHaveSshPortsOpenToInternet()
		{
			var resources = await Testing.RunAsync<WebserverStack>();

			foreach (var securityGroup in resources.OfType<SecurityGroup>())
			{
				var urn = await securityGroup.Urn.GetValueAsync();
				var ingress = await securityGroup.Ingress.GetValueAsync();
				foreach (var rule in ingress)
				{
					(rule.FromPort == 22 && rule.CidrBlocks.Any(b => b == "0.0.0.0/0"))
						.Should().BeFalse($"Illegal SSH port 22 open to the Internet (CIDR 0.0.0.0/0) on group {urn}");
				}
			}
		}
	}
}
