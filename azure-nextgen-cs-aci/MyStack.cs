// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.
using Pulumi;
using Pulumi.AzureNextGen.ContainerInstance.Latest;
using Pulumi.AzureNextGen.ContainerInstance.Latest.Inputs;
using Pulumi.AzureNextGen.Resources.Latest;

class MyStack : Stack
{
    public MyStack()
    {
        var config = new Pulumi.Config();
        var location = config.Get("location") ?? "WestUS";

        var resourceGroup = new ResourceGroup("resourceGroup", new ResourceGroupArgs
        {
            ResourceGroupName = "aci-rg",
            Location = location
        });
        
        var imageName = "mcr.microsoft.com/azuredocs/aci-helloworld";
        var containerGroup = new ContainerGroup("containerGroup", new ContainerGroupArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Location = resourceGroup.Location,
            ContainerGroupName = "helloworld",
            OsType = "Linux",
            Containers =
            {
                new ContainerArgs
                {
                    Name = "acilinuxpublicipcontainergroup",
                    Image = imageName,
                    Ports = { new ContainerPortArgs { Port = 80} },
                    Resources = new ResourceRequirementsArgs
                    {
                        Requests = new ResourceRequestsArgs
                        {
                            Cpu = 1.0,
                            MemoryInGB = 1.5,
                        }
                    }
                }
            },
            IpAddress = new IpAddressArgs
            {
                Ports =
                {
                    new PortArgs
                    {
                        Port = 80,
                        Protocol = "Tcp",
                    }
                },
                Type = "Public"
            },
            RestartPolicy = "always"
        });

        this.ContainerIPv4Address = containerGroup.IpAddress.Apply(ip => ip!.Ip);
    }

    [Output("containerIPv4Address")]
    public Output<string> ContainerIPv4Address { get; set; }
}
