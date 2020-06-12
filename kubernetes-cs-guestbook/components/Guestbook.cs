// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;

class Guestbook : Stack
{
    public Guestbook()
    {
        var config = new Config();
        var isMiniKube = config.GetBoolean("isMiniKube") ?? false;

        var redisLeader = new ServiceDeployment("redis-leader", new ServiceDeploymentArgs
        {
            Image = "redis",
            Ports = {6379}
        });

        var redisReplica = new ServiceDeployment("redis-replica", new ServiceDeploymentArgs
        {
            Image = "pulumi/guestbook-redis-replica",
            Ports = {6379}
        });

        var frontend = new ServiceDeployment("frontend", new ServiceDeploymentArgs
        {
            Replicas = 3,
            Image = "pulumi/guestbook-php-redis",
            Ports = {80},
            AllocateIPAddress = true,
            ServiceType = isMiniKube ? "ClusterIP" : "LoadBalancer"
        });

        this.FrontendIp = frontend.IpAddress;
    }

    [Output] public Output<string> FrontendIp { get; set; }
}
