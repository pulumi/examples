// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Gcp.Container;
using Pulumi.Gcp.Container.Inputs;
using Pulumi.Gcp.Container.Outputs;

class KubernetesStack : Stack
{
    public KubernetesStack()
    {
        var masterVersion = new Config().Get("masterVersion")
                            ?? (Input<string>) Output.Create(GetEngineVersions.InvokeAsync())
                                .Apply(v => v.LatestMasterVersion);

        var cluster = new Cluster("helloworld", new ClusterArgs
        {
            InitialNodeCount = 2,
            MinMasterVersion = masterVersion,
            NodeVersion = masterVersion,
            NodeConfig = new ClusterNodeConfigArgs
            {
                MachineType = "n1-standard-1",
                OauthScopes =
                {
                    "https://www.googleapis.com/auth/compute",
                    "https://www.googleapis.com/auth/devstorage.read_only",
                    "https://www.googleapis.com/auth/logging.write",
                    "https://www.googleapis.com/auth/monitoring"
                }
            }
        });

        this.KubeConfig = Output.Tuple(cluster.Name, cluster.Endpoint, cluster.MasterAuth).Apply(
            t => GetKubeconfig(t.Item1, t.Item2, t.Item3)
        );

        this.ClusterName = cluster.Name;
    }

    [Output] public Output<string> ClusterName { get; set; }

    [Output] public Output<string> KubeConfig { get; set; }

    private static string GetKubeconfig(string clusterName, string clusterEndpoint, ClusterMasterAuth clusterMasterAuth)
    {
        var context = $"{Pulumi.Gcp.Config.Project}_{Pulumi.Gcp.Config.Zone}_{clusterName}";
        return $@"apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: {clusterMasterAuth.ClusterCaCertificate}
    server: https://{clusterEndpoint}
  name: {context}
contexts:
- context:
    cluster: {context}
    user: {context}
  name: {context}
current-context: {context}
kind: Config
preferences: {{}}
users:
- name: {context}
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      installHint: Install gke-gcloud-auth-plugin for use with kubectl by following
        https://cloud.google.com/blog/products/containers-kubernetes/kubectl-auth-changes-in-gke
      provideClusterInfo: true
";
    }
}
