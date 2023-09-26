// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.
using System;
using Pulumi;
using System.Linq;
using Pulumi.AzureNative.ContainerRegistry;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.Sql;
using Pulumi.AzureNative.Web;
using Pulumi.AzureNative.Web.Inputs;
using Pulumi.Docker;
using System.Collections.Generic;

return await Pulumi.Deployment.RunAsync(() =>
{
    var resourceGroup = new ResourceGroup("appservice-docker-rg");

    var config = new Pulumi.Config();
    var username = config.Get("sqlUsername") ?? "sqladminuser";
    var password = config.RequireSecret("sqlPassword");

    var sqlServer = new Server("sqlserver", new ServerArgs
    {
        ResourceGroupName = resourceGroup.Name,
        AdministratorLogin = username,
        AdministratorLoginPassword = password,
        Version = "12.0",
    });

    var database = new Database("db", new DatabaseArgs
    {
        ResourceGroupName = resourceGroup.Name,
        ServerName = sqlServer.Name,
        Sku = new Pulumi.AzureNative.Sql.Inputs.SkuArgs
        {
            Name = "S0"
        }
    });

    var plan = new AppServicePlan("linux-apps", new AppServicePlanArgs
    {
        ResourceGroupName = resourceGroup.Name,
        Kind = "Linux",
        Reserved = true,
        Sku = new SkuDescriptionArgs
        {
            Name = "B1",
            Tier = "Basic"
        }
    });

    //
    // deploying a custom image from Azure Container Registry.
    //
    var customImage = "node-app";

    var registry = new Registry("myregistry", new RegistryArgs
    {
        ResourceGroupName = resourceGroup.Name,
        Sku = new Pulumi.AzureNative.ContainerRegistry.Inputs.SkuArgs
        {
            Name = Pulumi.AzureNative.ContainerRegistry.SkuName.Basic,
        },
        AdminUserEnabled = true
    });

    var credentials = GetRegistryCredentials(resourceGroup.Name, registry.Name);

    var myImage = new Image(customImage, new ImageArgs
    {
        ImageName = Output.Format($"{registry.LoginServer}/{customImage}:v1.0.0"),
        Build = new Pulumi.Docker.Inputs.DockerBuildArgs
        {
            Context = $"./{customImage}",
            Platform = "linux/amd64"
        },
        Registry = new Pulumi.Docker.Inputs.RegistryArgs
        {
            Server = registry.LoginServer,
            Username = credentials.username,
            Password = credentials.password
        },
    });

    var getStartedApp = new WebApp("get-started", new WebAppArgs
    {
        ResourceGroupName = resourceGroup.Name,
        ServerFarmId = plan.Id,
        SiteConfig = new SiteConfigArgs
        {
            AppSettings = new[]
            {
                new NameValuePairArgs
                {
                    Name = "WEBSITES_ENABLE_APP_SERVICE_STORAGE",
                    Value = "false"
                },
                new NameValuePairArgs
                {
                    Name = "DOCKER_REGISTRY_SERVER_URL",
                    Value = Output.Format($"https://{registry.LoginServer}")
                },
                new NameValuePairArgs
                {
                    Name = "DOCKER_REGISTRY_SERVER_USERNAME",
                    Value = credentials.username,
                },
                new NameValuePairArgs
                {
                    Name = "DOCKER_REGISTRY_SERVER_PASSWORD",
                    Value = credentials.password,
                },
                new NameValuePairArgs
                {
                    Name = "WEBSITES_PORT",
                    Value = "80" // Our custom image exposes port 80. Adjust for your app as needed.
                }
            },
            ConnectionStrings =
            {
                new ConnStringInfoArgs
                {
                    Name = "db",
                    Type = ConnectionStringType.SQLAzure,
                    ConnectionString = GetConnectionString(sqlServer.Name, database.Name, username, password),
                },
            },
            AlwaysOn = true,
            LinuxFxVersion = Output.Format($"DOCKER|{myImage.ImageName}")
        },
        HttpsOnly = true
    });

    return new Dictionary<string, object?>
    {
        ["GetStartedEndpoint"] = Output.Format($"https://{getStartedApp.DefaultHostName}"),
    };
});

(Output<string> username, Output<string> password) GetRegistryCredentials(Output<string> resourceGroupName, Output<string> registryName)
{
    var credentials = ListRegistryCredentials.Invoke(new ListRegistryCredentialsInvokeArgs
    {
        ResourceGroupName = resourceGroupName,
        RegistryName = registryName
    });

    var adminUsername = credentials.Apply(c => c.Username ?? "");
    var adminPassword = credentials.Apply(c => Output.CreateSecret(c.Passwords.First().Value ?? ""));
    return (adminUsername, adminPassword);
}

Output<string> GetConnectionString(Output<string> name, Output<string> dbName, string username, Output<string> password)
{
    return Output.Tuple(name, dbName, password).Apply(t =>
    {
        (string server, string database, string pwd) = t;
        return
            $"Server= tcp:{server}.database.windows.net;initial catalog={database};userID={username};password={pwd};Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;";
    });
}
