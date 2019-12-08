// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Pulumi;
using Pulumi.Kubernetes.Core.V1;
using Pulumi.Kubernetes.Types.Inputs.Core.V1;
using Pulumi.Kubernetes.Types.Inputs.Apps.V1;
using Pulumi.Kubernetes.Types.Inputs.Meta.V1;
using Pulumi.Kubernetes.Types.Inputs.ApiExtensions.V1Beta1;

class Program
{
    static Task<int> Main(string[] args)
    {
        return Deployment.RunAsync(() =>
        {
            var config = new Config();
            var isMiniKube = config.GetBoolean("isMiniKube") ?? false;

            var redisMaster = new ServiceDeployment("redis-master", new ServiceDeploymentArgs
            {
                Image = "k8s.gcr.io/redis:e2e",
                Ports = { 6379 },
            });

            var redisReplica = new ServiceDeployment("redis-slave", new ServiceDeploymentArgs
            {
                Image = "gcr.io/google_samples/gb-redisslave:v1",
                Ports = { 6379 },
            });

            var frontend = new ServiceDeployment("frontend", new ServiceDeploymentArgs
            {
                Replicas = 3,
                Image = "gcr.io/google-samples/gb-frontend:v4",
                Ports = { 80 },
                AllocateIPAddress = true,
                ServiceType = isMiniKube ? "ClusterIP" : "LoadBalancer",
            });

            return new Dictionary<string, object?>{
                { "frontendIp", frontend.IpAddress },
            };

        });
    }
}
