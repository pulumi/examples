using System.Collections.Generic;
using System.Threading.Tasks;

using Pulumi;
using Pulumi.Gcp.Compute;
using Pulumi.Gcp.Compute.Inputs;

class Program
{
    static Task<int> Main()
    {
        return Deployment.RunAsync(() =>
        {
            string instanceName = "test";
            var network = new Pulumi.Gcp.Compute.Network(instanceName);

            var firewall = new Pulumi.Gcp.Compute.Firewall(instanceName, new Pulumi.Gcp.Compute.FirewallArgs()
            {
                Allows = new InputList<FirewallAllowsArgs>(){
                    new FirewallAllowsArgs(){
                        Ports={"22"},
                        Protocol="tcp"
                    }
                },
                Network = network.SelfLink
            });
            var addr = new Address(instanceName);

            var vm = new Pulumi.Gcp.Compute.Instance(instanceName, new Pulumi.Gcp.Compute.InstanceArgs()
            {
                MachineType = "f1-micro",
                Zone = "us-central1-a",
                InitializeParams = new InstanceBootDiskInitializeParamsArgs()
                {
                    Image = "ubuntu-1604-xenial-v20191010"
                },
                Metadata = new InputMap<string>{
                {
                    "ssh-keys","username:public_key"}
                },
                NetworkInterfaces = new InstanceNetworkInterfacesArgs()
                {
                    Network = network.Id,
                    AccessConfigs ={new InstanceNetworkInterfacesAccessConfigsArgs(){
                        NatIp=addr.IPAddress
                    }}
                }
            });

            return new Dictionary<string, object>
            {
                {"VM",vm}
            };
        });
    }
}
