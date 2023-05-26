// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using System.Threading.Tasks;
using Pulumi;
using Pulumi.AzureNative.Resources;
using Pulumi.Kubernetes.Core.V1;
using Pulumi.Kubernetes.Helm;
using Pulumi.Kubernetes.Helm.V3;
using Pulumi.Kubernetes.Types.Inputs.Core.V1;
using Pulumi.Kubernetes.Types.Inputs.Meta.V1;

await Pulumi.Deployment.RunAsync<CosmosStack>();

class CosmosStack : Stack
{
    public CosmosStack()
    {
        var resourceGroup = new ResourceGroup("cosmosrg");

        var mongo = new CosmosDBMongoDB("mongo-todos", new CosmosDBMongoDBArgs
        {
            ResourceGroupName = resourceGroup.Name,
            DatabaseName = "todos"
        });

        var myCluster = new AksCluster("demoaks", new AksClusterArgs
        {
            ResourceGroupName = resourceGroup.Name,
            KubernetesVersion = "1.26.3",
            NodeCount = 1,
            NodeSize = "Standard_D2_v2"
        });

        var secretName = "mongo-secrets";
        var mongoConnectionSecret = new Secret(secretName, new SecretArgs
        {
            Metadata = new ObjectMetaArgs {Name = secretName},
            Data = CosmosDBMongoDB.KubernetesSecretData(resourceGroup.Name, mongo.AccountName, mongo.DatabaseName)
        }, new CustomResourceOptions {Provider = myCluster.Provider});

        var chart = new Chart("node", new ChartArgs
        {
            Chart = "node",
            Version = "15.2.3",
            FetchOptions = new ChartFetchArgs
            {
                Repo = "https://charts.bitnami.com/bitnami"
            },
            Values =
            {
                {"service", new {type = "LoadBalancer"}},
                {"mongodb", new {enabled = false}},
                {"externaldb", new {enabled = true, ssl = true, secretName = secretName}}
            }
        }, new ComponentResourceOptions {Provider = myCluster.Provider});

        var ip = chart.GetResource<Service>("node")
            .Apply(svc => svc.Status.Apply(s => s.LoadBalancer.Ingress[0].Ip));
        this.Endpoint = Output.Format($"http://{ip}");
    }

    [Output] public Output<string> Endpoint { get; set; }
}
