// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.DigitalOcean;
using Pulumi.DigitalOcean.Inputs;

class DropletStack : Stack
{
    public DropletStack()
    {
        var dropletCount = 2;
        var region = "nyc3";

        var dropletTypeTag = new Tag($"demo-app-{Pulumi.Deployment.Instance.ProjectName}");

        var userData = @"
#!/bin/bash
sudo apt-get update
sudo apt-get install -y nginx
";
        var droplets = new Droplet[dropletCount];
        for (var i = 0; i < dropletCount; i++)
        {
            var nameTag = new Tag($"web-{i}");
            droplets[i] = new Droplet($"web-{i}", new DropletArgs
            {
                Image = "ubuntu-20-04-x64",
                Region = region,
                PrivateNetworking = true,
                Size = "s-1vcpu-1gb",
                Tags =
                {
                    dropletTypeTag.Id,
                    nameTag.Id
                },
                UserData = userData.Trim()
            });
        }

        var loadbalancer = new LoadBalancer("public", new LoadBalancerArgs
        {
            DropletTag = dropletTypeTag.Name,
            ForwardingRules = new LoadBalancerForwardingRuleArgs
            {
                EntryPort = 80,
                EntryProtocol = "http",
                TargetPort = 80,
                TargetProtocol = "http"
            },
            Healthcheck = new LoadBalancerHealthcheckArgs
            {
                Port = 80,
                Protocol = "tcp"
            },
            Region = region
        });

        this.Endpoint = loadbalancer.Ip;
    }

    [Output] public Output<string> Endpoint { get; set; }
}
