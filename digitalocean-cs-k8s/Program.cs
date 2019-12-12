using System.Collections.Generic;
using System.Threading.Tasks;
using Pulumi;
using Pulumi.Digitalocean;
using Pulumi.Digitalocean.Inputs;
using Pulumi.Kubernetes.Core.V1;
using Pulumi.Kubernetes.Types.Inputs.Apps.V1;
using Pulumi.Kubernetes.Types.Inputs.Core.V1;
using Pulumi.Kubernetes.Types.Inputs.Meta.V1;
using Config = Pulumi.Config;
using Provider = Pulumi.Kubernetes.Provider;
using ProviderArgs = Pulumi.Kubernetes.ProviderArgs;

class Program {
	static Task<int> Main() {
		return Deployment.RunAsync(() => {
			var config = new Config();
			var nodeCount = config.GetInt32("nodeCount") ?? 2;
			var appReplicaCount = config.GetInt32("appReplicaCount") ?? 5;
			var domainName = config.Get("domainName");

			var cluster = new KubernetesCluster("do-cluser", new KubernetesClusterArgs {
				Region = "sfo2",
				Version = "latest",
				NodePool = new KubernetesClusterNodePoolArgs {
					Name = "default",
					Size = "s-2vcpu-2gb",
					NodeCount = nodeCount
				}
			});

			var k8sProvider = new Provider("do-k8s", new ProviderArgs {
				KubeConfig = cluster.KubeConfigs.Apply(array => array[0].RawConfig)
			});

			var app = new Pulumi.Kubernetes.Apps.V1.Deployment("do-app-dep", new DeploymentArgs {
				Spec = new DeploymentSpecArgs {
					Selector = new LabelSelectorArgs {
						MatchLabels = {
							{"app", "app-nginx"}
						}
					},
					Replicas = appReplicaCount,
					Template = new PodTemplateSpecArgs {
						Metadata = new ObjectMetaArgs {
							Labels = {
								{"app", "app-nginx"}
							}
						},
						Spec = new PodSpecArgs {
							Containers = new ContainerArgs {
								Name = "nginx",
								Image = "nginx"
							}
						}
					}
				}
			}, new CustomResourceOptions {
				Provider = k8sProvider
			});

			var appService = new Service("do-app-svc", new ServiceArgs {
				Spec = new ServiceSpecArgs {
					Type = "LoadBalancer",
					Selector = app.Spec.Apply(spec => spec.Template.Metadata.Labels),
					Ports = new ServicePortArgs {
						Port = 80
					}
				}
			}, new CustomResourceOptions {
				Provider = k8sProvider
			});

			var ingressIp = appService.Status.Apply(status => status.LoadBalancer.Ingress[0].Ip);

			if (!string.IsNullOrWhiteSpace(domainName)) {
				var domain = new Domain("do-domain", new DomainArgs {
					Name = domainName,
					IpAddress = ingressIp
				});

				var cnameRecord = new DnsRecord("do-domain-cname", new DnsRecordArgs {
					Domain = domain.Name,
					Type = "CNAME",
					Name = "www",
					Value = "@"
				});
			}

			return new Dictionary<string, object?> {
				{"ingressIp", ingressIp}
			};
		});
	}
}
