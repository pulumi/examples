// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.
using Pulumi;
using Pulumi.AzureNative.ContainerInstance;
using Pulumi.AzureNative.ContainerInstance.Inputs;
using Pulumi.AzureNative.Resources;

class MyStack : Stack
{
    public MyStack()
    {
        var resourceGroup = new ResourceGroup("aci-rg");
        
        var imageName = "mcr.microsoft.com/azuredocs/aci-helloworld";
        var containerGroup = new ContainerGroup("helloworld", new ContainerGroupArgs
        {
            ResourceGroupName = resourceGroup.Name,
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
