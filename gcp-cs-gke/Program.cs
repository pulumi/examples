using System.Collections.Generic;
using System.Threading.Tasks;

using Pulumi;
using Pulumi.Gcp.Container;
using Pulumi.Gcp.Container.Inputs;
using Pulumi.Gcp.Container.Outputs;

class Program
{
    static Task<int> Main()
    {
        return Deployment.RunAsync(async () =>
        {
            var name = "helloworld";

            var config = new Config();

            var latestMasterVersion = await Invokes.GetEngineVersions(new GetEngineVersionsArgs { });
            var masterVersion = config.Get("masterVersion") ?? latestMasterVersion.LatestMasterVersion;

            var cluster = new Cluster(name, new ClusterArgs
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
                        "https://www.googleapis.com/auth/monitoring",
                    },
                }
            });

            var kubeconfig = Output.Tuple<string, string, ClusterMasterAuth>(cluster.Name, cluster.Endpoint, cluster.MasterAuth).Apply(
                t => GetKubeconfig(t.Item1, t.Item2, t.Item3)
            );

            return new Dictionary<string, object>
            {
                {"clusterName", cluster.Name},
                {"kubeconfig", kubeconfig},
            };
        });
    }

    private static string GetKubeconfig(string clusterName, string clusterEndpoint, ClusterMasterAuth clusterMasterAuth)
    {
        var context = $"{Pulumi.Gcp.Config.Config.Project}_{Pulumi.Gcp.Config.Config.Zone}_{clusterName}";
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
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{{.credential.token_expiry}}'
        token-key: '{{.credential.access_token}}'
      name: gcp";
    }

}
