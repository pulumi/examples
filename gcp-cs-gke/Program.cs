using System.Collections.Generic;
using System.Threading.Tasks;

using Pulumi;
using Pulumi.Gcp.Container;
using Pulumi.Gcp.Container.Inputs;

class Program
{
    static Task<int> Main()
    {
        return Deployment.RunAsync(async () =>
        {

            var name = "helloworld";

            var config = new Config();

            var latestMasterVersion = await Pulumi.Gcp.Container.Invokes.GetEngineVersions(new GetEngineVersionsArgs { });
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

            var kubeconfig = Output.Tuple<string,string,Pulumi.Gcp.Container.Outputs.ClusterMasterAuth>(cluster.Name, cluster.Endpoint, cluster.MasterAuth).Apply(t =>
             {
                 var context = $"{Pulumi.Gcp.Config.Config.Project}_{Pulumi.Gcp.Config.Config.Zone}_{t.Item1[0]}";
                 return $@"apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: {t.Item3.ClusterCaCertificate}
    server: https://{t.Item2[1]}
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
             });

            return new Dictionary<string, object>
            {
                {"clusterName", cluster.Name},
                {"kubeconfig", kubeconfig},
            };
        });
    }
}
