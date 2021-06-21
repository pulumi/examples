using Pulumi;
using Docker = Pulumi.Docker;

class MyStack : Stack
{
    public MyStack()
    {
        const int RedisPort = 6379;
        const string RedisHost = "redisdb";

        var network = new Docker.Network("network");

        var redisImage = new Docker.RemoteImage("RedisImage", new Docker.RemoteImageArgs{
            Name = "redis:6.2",
            KeepLocally = true
        });

        var redisContainer = new Docker.Container("RedisContainer", new Docker.ContainerArgs
        {
            Image = redisImage.Latest,
            Ports = new InputList<Docker.Inputs.ContainerPortArgs> {
                new Docker.Inputs.ContainerPortArgs
                {
                    Internal = RedisPort,
                    External = RedisPort
                }
            },
            NetworksAdvanced = new InputList<Docker.Inputs.ContainerNetworksAdvancedArgs> {
                new Docker.Inputs.ContainerNetworksAdvancedArgs
                {
                    Name = network.Name,
                    Aliases = new InputList<string> {
                        RedisHost
                    }
                }
            }
        });

        var appImage = new Docker.Image("AppImage", new Docker.ImageArgs
        {
            Build = new Docker.DockerBuild 
            {
                Context = "../App"
            },
            ImageName = "app",
            SkipPush = true
        });

        var appContainer = new Docker.Container("AppContainer", new Docker.ContainerArgs
        {
            Image = appImage.BaseImageName,
            Ports = new InputList<Docker.Inputs.ContainerPortArgs> {
                new Docker.Inputs.ContainerPortArgs
                {
                    Internal = 80,
                    External = 8080
                }
            },
            Envs = new InputList<string> {
                $"REDIS_HOST={RedisHost}",
                $"REDIS_PORT={RedisPort}"
            },
            NetworksAdvanced = new InputList<Docker.Inputs.ContainerNetworksAdvancedArgs> {
                new Docker.Inputs.ContainerNetworksAdvancedArgs
                {
                    Name = network.Name
                }
            }
        }, new CustomResourceOptions
        {
            DependsOn = redisContainer
        });

        this.Url = Output.Create("http://localhost:8080/Cache");
    }

    [Output]
    public Output<string> Url {get;set;}
}
