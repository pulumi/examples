[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-net5-aks-webapp/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-net5-aks-webapp/README.md#gh-dark-mode-only)

# Deploy Containerized Web Applications using the native Azure Provider, .NET 5, and C# 9

The example demonstrate several Pulumi features:

- Azure-Native provider
- Running on .NET 5
- Using C# 9 constructs like top-level statements, implicit constuctors, and records
- Defining and using components with Pulumi

## Adjust the code

This example can cover several deployments architectures that are listed below.

### Public Docker Image to Azure App Service

You can deploy any public Docker image that contains a web application listening to port 80 to an Azure App Service. Modify the constructor of `MyStack` class in `Program.cs` file to

```cs
public MyStack()
{
    var app = new WebApplication("hello", new()
    {
        DockerImage = "strm/helloworld-http"
    });

    this.Endpoint = app.Endpoint;
}
```

### Custom Application to Azure App Service

Builds a Docker container from the files in `app` folder, push it to Azure Container Registry, and deploy it to an Azure App Service. Modify the constructor of `MyStack` class in `Program.cs` file to

```cs
public MyStack()
{
    var app = new WebApplication("hello", new()
    {
        AppFolder = "./app"
    });

    this.Endpoint = app.Endpoint;
}
```

### Public Docker Image to Azure Kubernetes Service

You can deploy any public Docker image that contains a web application listening to port 80 to a new AKS cluster. Modify the constructor of `MyStack` class in `Program.cs` file to

```cs
public MyStack()
{
    var cluster = new AksCluster("demoaks");

    var app = new WebApplication("hello", new()
    {
        Cluster = cluster,
        DockerImage = "strm/helloworld-http"
    });

    this.Endpoint = app.Endpoint;
}
```

### Custom Application to Azure Kubernetes Service

Builds a Docker container from the files in `app` folder, push it to Azure Container Registry, and deploy it to a new AKS cluster. Modify the constructor of `MyStack` class in `Program.cs` file to

```cs
public MyStack()
{
    var cluster = new AksCluster("demoaks");

    var app = new WebApplication("hello", new()
    {
        Cluster = cluster,
        AppFolder = "./app"
    });

    this.Endpoint = app.Endpoint;
}
```

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Azure Credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)

### Steps

After cloning this repo and making adjustments as described above, from this working directory, run these commands:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1. Set the Azure region location to use:

    ```
    $ pulumi config set azure-native:location westus2
    ```

1. Stand up the application by invoking pulumi

    ```bash
    $ pulumi up
    ```

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
