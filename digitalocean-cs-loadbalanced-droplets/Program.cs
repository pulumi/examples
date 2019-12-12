using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Pulumi;
using Pulumi.Digitalocean;
using Pulumi.Digitalocean.Inputs;

class Program {
	static Task<int> Main() {
		return Deployment.RunAsync(() => {
			var dropletCount = 3;
			var region = "nyc3";

			var dropletTypeTag = new Tag("demo-app");

			var userData = @"
#!/bin/bash
sudo apt-get update
sudo apt-get install -y nginx
";
			var droplets = new Droplet[dropletCount];
			for (var i = 0; i < dropletCount; i++) {
				var nameTag = new Tag($"web-{i}");
				droplets[i] = new Droplet($"web-{i}", new DropletArgs {
					Image = "ubuntu-18-04-x64",
					Region = region,
					PrivateNetworking = true,
					Size = "512mb",
					Tags = {
						dropletTypeTag.Id,
						nameTag.Id
					},
					UserData = userData.Trim()
				});
			}

			var loadbalancer = new LoadBalancer("public", new LoadBalancerArgs {
				DropletTag = dropletTypeTag.Name,
				ForwardingRules = new LoadBalancerForwardingRulesArgs {
					EntryPort = 80,
					EntryProtocol = "http",
					TargetPort = 80,
					TargetProtocol = "http"
				},
				Healthcheck = new LoadBalancerHealthcheckArgs {
					Port = 80,
					Protocol = "tcp"
				},
				Region = region
			});

			return new Dictionary<string, object?> {
				{"endpoint", loadbalancer.Ip}
			};
		});
	}
}
