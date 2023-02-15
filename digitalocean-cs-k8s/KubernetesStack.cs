// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.DigitalOcean;
using Pulumi.DigitalOcean.Inputs;
using Pulumi.Kubernetes.Core.V1;
using Pulumi.Kubernetes.Types.Inputs.Apps.V1;
using Pulumi.Kubernetes.Types.Inputs.Core.V1;
using Pulumi.Kubernetes.Types.Inputs.Meta.V1;
using Config = Pulumi.Config;
using Provider = Pulumi.Kubernetes.Provider;
using ProviderArgs = Pulumi.Kubernetes.ProviderArgs;

class KubernetesStack : Stack
{
    public KubernetesStack()
    {
        var config = new Config();
        var nodeCount = config.GetInt32("nodeCount") ?? 2;
        var appReplicaCount = config.GetInt32("appReplicaCount") ?? 5;
        var domainName = config.Get("domainName");

        var cluster = new KubernetesCluster("do-cluster", new KubernetesClusterArgs
        {
            Region = "nyc3",
            Version = Pulumi.DigitalOcean.GetKubernetesVersions.Invoke().Apply(versions => versions.LatestVersion),
            NodePool = new KubernetesClusterNodePoolArgs
            {
                Name = "default",
                Size = "s-2vcpu-2gb",
                NodeCount = nodeCount
            }
        });

        var k8sProvider = new Provider("do-k8s", new ProviderArgs
        {
            KubeConfig = cluster.KubeConfigs.GetAt(0).Apply(v => v.RawConfig)
        });

        var app = new Pulumi.Kubernetes.Apps.V1.Deployment("do-app-dep", new DeploymentArgs
        {
            Spec = new DeploymentSpecArgs
            {
                Selector = new LabelSelectorArgs
                {
                    MatchLabels =
                    {
                        {"app", "app-nginx"}
                    }
                },
                Replicas = appReplicaCount,
                Template = new PodTemplateSpecArgs
                {
                    Metadata = new ObjectMetaArgs
                    {
                        Labels =
                        {
                            {"app", "app-nginx"}
                        }
                    },
                    Spec = new PodSpecArgs
                    {
                        Containers = new ContainerArgs
                        {
                            Name = "nginx",
                            Image = "nginx"
                        }
                    }
                }
            }
        }, new CustomResourceOptions {Provider = k8sProvider});

        var appService = new Service("do-app-svc", new ServiceArgs
        {
            Spec = new ServiceSpecArgs
            {
                Type = "LoadBalancer",
                Selector = app.Spec.Apply(spec => spec.Template.Metadata.Labels),
                Ports = new ServicePortArgs
                {
                    Port = 80
                }
            }
        }, new CustomResourceOptions {Provider = k8sProvider});

        this.IngressIp = appService.Status.Apply(status => status.LoadBalancer.Ingress[0].Ip);

        if (!string.IsNullOrWhiteSpace(domainName))
        {
            var domain = new Domain("do-domain", new DomainArgs
            {
                Name = domainName,
                IpAddress = this.IngressIp
            });

            var cnameRecord = new DnsRecord("do-domain-cname", new DnsRecordArgs
            {
                Domain = domain.Name,
                Type = "CNAME",
                Name = "www",
                Value = "@"
            });
        }
    }

    [Output] public Output<string> IngressIp { get; set; }
}
