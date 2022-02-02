// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Kubernetes.Core.V1;
using System.Collections.Generic;
using Pulumi.Kubernetes.Types.Inputs.Helm.V3;
using Pulumi.Kubernetes.Helm.V3;

class MyStack : Stack
{
    public MyStack()
    {
        // Deploy the bitnami/wordpress chart.
        var wordpress = new Release("wpdev", new ReleaseArgs
        {
            Chart = "wordpress",
            RepositoryOpts = new RepositoryOptsArgs
            {
                Repo = "https://charts.bitnami.com/bitnami"
            },
            Version = "13.0.6",
            Values = new InputMap<object>
            {
                ["service"] = new Dictionary<string, object>
                {
                    ["type"] = "ClusterIP",
                },
            },
        });

        // Get the status field from the wordpress service, and then grab a reference to the spec.
        var status = wordpress.Status;
        var service = Service.Get("wpdev-wordpress", Output.All(status).Apply(
            s => $"{s[0].Namespace}/{s[0].Name}-wordpress"));
        // Export the Cluster IP for Wordpress.
        this.FrontendIP = service.Spec.Apply(spec => spec.ClusterIP);
        // Command to run to access the wordpress frontend on localhost:8080
        this.PortForwardCommand = Output.Format($"kubectl port-forward svc/{service.Metadata.Apply(m => m.Name)} 8080:80");
    }

    [Output]
    public Output<string> FrontendIP { get; set; }

    [Output]
    public Output<string> PortForwardCommand { get; set; }
}
