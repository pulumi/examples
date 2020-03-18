// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;

class Guestbook : Stack
{
	public Guestbook()
	{
		var config = new Config();
		var isMiniKube = config.GetBoolean("isMiniKube") ?? false;

		var redisMaster = new ServiceDeployment("redis-master", new ServiceDeploymentArgs
		{
			Image = "k8s.gcr.io/redis:e2e",
			Ports = { 6379 }
		});

		var redisReplica = new ServiceDeployment("redis-slave", new ServiceDeploymentArgs
		{
			Image = "gcr.io/google_samples/gb-redisslave:v1",
			Ports = { 6379 }
		});

		var frontend = new ServiceDeployment("frontend", new ServiceDeploymentArgs
		{
			Replicas = 3,
			Image = "gcr.io/google-samples/gb-frontend:v4",
			Ports = { 80 },
			AllocateIPAddress = true,
			ServiceType = isMiniKube ? "ClusterIP" : "LoadBalancer"
		});

		this.FrontendIp = frontend.IpAddress;
	}
	
	[Output]
	public Output<string> FrontendIp { get; set; }
}
