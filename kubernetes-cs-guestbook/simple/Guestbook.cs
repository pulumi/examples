// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Kubernetes.Types.Inputs.Core.V1;
using Pulumi.Kubernetes.Types.Inputs.Apps.V1;
using Pulumi.Kubernetes.Types.Inputs.Meta.V1;

class Guestbook : Stack
{
    public Guestbook()
    {
        // Minikube does not implement services of type `LoadBalancer`; require the user to
        // specify if we're running on minikube, and if so, create only services of type
        // ClusterIP.
        var config = new Config();
        var isMiniKube = config.GetBoolean("isMiniKube") ?? false;

        //
        // REDIS MASTER.
        //

        var redisLeaderLabels = new InputMap<string>
        {
            {"app", "redis-leader"}
        };

        var redisLeaderDeployment = new Pulumi.Kubernetes.Apps.V1.Deployment("redis-leader", new DeploymentArgs
        {
            Spec = new DeploymentSpecArgs
            {
                Selector = new LabelSelectorArgs
                {
                    MatchLabels = redisLeaderLabels
                },
                Template = new PodTemplateSpecArgs
                {
                    Metadata = new ObjectMetaArgs
                    {
                        Labels = redisLeaderLabels
                    },
                    Spec = new PodSpecArgs
                    {
                        Containers =
                        {
                            new ContainerArgs
                            {
                                Name = "redis-leader",
                                Image = "redis",
                                Resources = new ResourceRequirementsArgs
                                {
                                    Requests =
                                    {
                                        {"cpu", "100m"},
                                        {"memory", "100Mi"}
                                    }
                                },
                                Ports =
                                {
                                    new ContainerPortArgs {ContainerPortValue = 6379}
                                }
                            }
                        }
                    }
                }
            }
        });

        var redisLeaderService = new Pulumi.Kubernetes.Core.V1.Service("redis-leader", new ServiceArgs
        {
            Metadata = new ObjectMetaArgs
            {
                Name = "redis-leader",
                Labels = redisLeaderDeployment.Metadata.Apply(metadata => metadata.Labels),
            },
            Spec = new ServiceSpecArgs
            {
                Ports =
                {
                    new ServicePortArgs
                    {
                        Port = 6379,
                        TargetPort = 6379
                    },
                },
                Selector = redisLeaderDeployment.Spec.Apply(spec => spec.Template.Metadata.Labels)
            }
        });

        //
        // REDIS REPLICA.
        //

        var redisReplicaLabels = new InputMap<string>
        {
            {"app", "redis-replica"}
        };

        var redisReplicaDeployment = new Pulumi.Kubernetes.Apps.V1.Deployment("redis-replica", new DeploymentArgs
        {
            Spec = new DeploymentSpecArgs
            {
                Selector = new LabelSelectorArgs
                {
                    MatchLabels = redisReplicaLabels
                },
                Template = new PodTemplateSpecArgs
                {
                    Metadata = new ObjectMetaArgs
                    {
                        Labels = redisReplicaLabels
                    },
                    Spec = new PodSpecArgs
                    {
                        Containers =
                        {
                            new ContainerArgs
                            {
                                Name = "redis-replica",
                                Image = "pulumi/guestbook-redis-replica",
                                Resources = new ResourceRequirementsArgs
                                {
                                    Requests =
                                    {
                                        {"cpu", "100m"},
                                        {"memory", "100Mi"}
                                    }
                                },
                                // If your cluster config does not include a dns service, then to instead access an environment
                                // variable to find the leader's host, change `value: "dns"` to read `value: "env"`.
                                Env =
                                {
                                    new EnvVarArgs
                                    {
                                        Name = "GET_HOSTS_FROM",
                                        Value = "dns"
                                    },
                                },
                                Ports =
                                {
                                    new ContainerPortArgs {ContainerPortValue = 6379}
                                }
                            }
                        }
                    }
                }
            }
        });

        var redisReplicaService = new Pulumi.Kubernetes.Core.V1.Service("redis-replica", new ServiceArgs
        {
            Metadata = new ObjectMetaArgs
            {
                Name = "redis-replica",
                Labels = redisReplicaDeployment.Metadata.Apply(metadata => metadata.Labels)
            },
            Spec = new ServiceSpecArgs
            {
                Ports =
                {
                    new ServicePortArgs
                    {
                        Port = 6379,
                        TargetPort = 6379
                    },
                },
                Selector = redisReplicaDeployment.Spec.Apply(spec => spec.Template.Metadata.Labels)
            }
        });

        //
        // FRONTEND
        //

        var frontendLabels = new InputMap<string>
        {
            {"app", "frontend"},
        };

        var frontendDeployment = new Pulumi.Kubernetes.Apps.V1.Deployment("frontend", new DeploymentArgs
        {
            Spec = new DeploymentSpecArgs
            {
                Selector = new LabelSelectorArgs
                {
                    MatchLabels = frontendLabels
                },
                Replicas = 3,
                Template = new PodTemplateSpecArgs
                {
                    Metadata = new ObjectMetaArgs
                    {
                        Labels = frontendLabels
                    },
                    Spec = new PodSpecArgs
                    {
                        Containers =
                        {
                            new ContainerArgs
                            {
                                Name = "php-redis",
                                Image = "pulumi/guestbook-php-redis",
                                Resources = new ResourceRequirementsArgs
                                {
                                    Requests =
                                    {
                                        {"cpu", "100m"},
                                        {"memory", "100Mi"},
                                    },
                                },
                                // If your cluster config does not include a dns service, then to instead access an environment
                                // variable to find the master service's host, change `value: "dns"` to read `value: "env"`.
                                Env =
                                {
                                    new EnvVarArgs
                                    {
                                        Name = "GET_HOSTS_FROM",
                                        Value = "dns", /* Value = "env"*/
                                    }
                                },
                                Ports =
                                {
                                    new ContainerPortArgs {ContainerPortValue = 80}
                                }
                            }
                        }
                    }
                }
            }
        });

        var frontendService = new Pulumi.Kubernetes.Core.V1.Service("frontend", new ServiceArgs
        {
            Metadata = new ObjectMetaArgs
            {
                Name = "frontend",
                Labels = frontendDeployment.Metadata.Apply(metadata => metadata.Labels)
            },
            Spec = new ServiceSpecArgs
            {
                Type = isMiniKube ? "ClusterIP" : "LoadBalancer",
                Ports =
                {
                    new ServicePortArgs
                    {
                        Port = 80,
                        TargetPort = 80
                    }
                },
                Selector = frontendDeployment.Spec.Apply(spec => spec.Template.Metadata.Labels)
            }
        });

        if (isMiniKube)
        {
            this.FrontendIp = frontendService.Spec.Apply(spec => spec.ClusterIP);
        }
        else
        {
            this.FrontendIp = frontendService.Status.Apply(status => status.LoadBalancer.Ingress[0].Ip ?? status.LoadBalancer.Ingress[0].Hostname);
        }
    }

    [Output] public Output<string> FrontendIp { get; set; }
}
