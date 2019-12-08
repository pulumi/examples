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

class ServiceDeploymentArgs
{
    public string Image { get; set; } = null!;
    public int? Replicas { get; set; }
    public ResourceRequirementsArgs? Resources { get; set; }
    public int[]? Ports { get; set; }
    public bool AllocateIPAddress { get; set; }
    public string? ServiceType { get; set; }
}

class ServiceDeployment : Pulumi.ComponentResource
{
    public Pulumi.Kubernetes.Apps.V1.Deployment Deployment;
    public Pulumi.Kubernetes.Core.V1.Service Service;
    public Output<string>? IpAddress;

    public ServiceDeployment(string name, ServiceDeploymentArgs args, ComponentResourceOptions? opts = null) : base(name, "k8sx:serice:ServiceDeployment", opts)
    {
        var labels = new InputMap<string>{
            { "app", name },
        };

        var deploymentPorts =
            args.Ports != null
            ? args.Ports.Select(p => new ContainerPortArgs { ContainerPortValue = 6379 }).ToArray()
            : Array.Empty<ContainerPortArgs>();

        var container = new ContainerArgs
        {
            Name = name,
            Image = args.Image,
            Resources = args.Resources ?? new ResourceRequirementsArgs
            {
                Requests =
                {
                    { "cpu", "100m" },
                    { "memory", "100Mi" },
                },
            },
            Env = new EnvVarArgs
            {
                Name = "GET_HOSTS_FROM",
                Value = "dns"
            },
            Ports = deploymentPorts,
        };

        this.Deployment = new Pulumi.Kubernetes.Apps.V1.Deployment(name, new DeploymentArgs
        {
            Spec = new DeploymentSpecArgs
            {
                Selector = new LabelSelectorArgs
                {
                    MatchLabels = labels,
                },
                Replicas = args.Replicas ?? 1,
                Template = new PodTemplateSpecArgs
                {
                    Metadata = new ObjectMetaArgs
                    {
                        Labels = labels,
                    },
                    Spec = new PodSpecArgs
                    {
                        Containers = { container },
                    },
                },
            },
        }, new CustomResourceOptions
        {
            Parent = this,
        });

        var servicePorts =
            args.Ports != null
            ? args.Ports.Select(p => new ServicePortArgs { Port = p, TargetPort = p }).ToArray()
            : Array.Empty<ServicePortArgs>();


        this.Service = new Pulumi.Kubernetes.Core.V1.Service(name, new ServiceArgs
        {
            Metadata = new ObjectMetaArgs
            {
                Name = name,
                Labels = this.Deployment.Metadata.Apply(metadata => metadata.Labels),
            },
            Spec = new ServiceSpecArgs
            {
                Type = args.AllocateIPAddress ? (args.ServiceType ?? "LoadBalancer") : null,
                Ports = servicePorts,
                Selector = this.Deployment.Spec.Apply(spec => spec.Template.Metadata.Labels),
            },
        }, new CustomResourceOptions
        {
            Parent = this,
        });

        if (args.AllocateIPAddress ) {
            this.IpAddress = 
                args.ServiceType == "ClusterIP" 
                ? this.Service.Spec.Apply(s => s.ClusterIP)
                : this.Service.Status.Apply(status => {
                    var ingress = status.LoadBalancer.Ingress[0];
                    // Return the ip address if populated or else the hostname
                    return ingress.Ip ?? ingress.Hostname;
                });
        }
    }
}
