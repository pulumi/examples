// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Kubernetes.Core.V1;
using Pulumi.Kubernetes.Helm;
using Pulumi.Kubernetes.Helm.V3;

class MyStack : Stack
{
    [Output]
    public Output<string> ApacheServiceIP { get; set; }

    [Output]
    public Output<string> ClusterName { get; set; }

    [Output]
    public Output<string> Kubeconfig { get; set; }

    public MyStack()
    {
        var myConfig = new MyConfig();
        var myCluster = new MyCluster(myConfig);

        var chart = new Chart("apache-chart", new ChartArgs
        {
            Chart = "apache",
            Version = "8.3.2",
            FetchOptions = new ChartFetchArgs
            {
                Repo = "https://charts.bitnami.com/bitnami"
            }
        }, new ComponentResourceOptions
        {
            Provider = myCluster.Provider
        });

        this.ApacheServiceIP = chart.GetResource<Service>("apache-chart")
            .Apply(svc => svc.Status.Apply(s => s.LoadBalancer.Ingress[0].Ip));

        this.ClusterName = myCluster.ClusterName;
        this.Kubeconfig = myCluster.Kubeconfig;
    }
}
