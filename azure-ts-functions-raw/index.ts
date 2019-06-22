import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

// Create a resource group for Windows App Service Plan
const resourceGroup = new azure.core.ResourceGroup("windowsrg");

const dotnetApp = new azure.appservice.ArchiveFunctionApp("http-dotnet", {
    resourceGroup,
    archive: new pulumi.asset.FileArchive("./dotnet/bin/Debug/netcoreapp2.1/publish"),
    appSettings: {
        "runtime": "dotnet",
    },
});

const nodeApp = new azure.appservice.ArchiveFunctionApp("http-node", {
    resourceGroup,
    archive: new pulumi.asset.FileArchive("./javascript"),
});

const powershellApp = new azure.appservice.ArchiveFunctionApp("http-powershell", {
    resourceGroup,
    archive: new pulumi.asset.FileArchive("./powershell"),
    appSettings: {
        "runtime": "powershell",
    },
});

const javaApp = new azure.appservice.ArchiveFunctionApp("http-java", {
    resourceGroupName: resourceGroup.name,
    archive: new pulumi.asset.FileArchive("./java/target/azure-functions/fabrikam-functions"),
    appSettings: {
        "runtime": "java",
    },
});

// Create a dedicated resoure group for Linux App Service Plan - require for Python
const linuxResourceGroup = new azure.core.ResourceGroup("linuxrg");

// Python Function App won't run on Windows Consumption Plan, so we create a Linux Consumption Plan instead
const linuxPlan = new azure.appservice.Plan("linux-asp", {
    resourceGroupName: linuxResourceGroup.name,
    kind: "Linux",
    sku: { tier: "Dynamic", size: "Y1" },
    reserved: true,
});

const pythonApp = new azure.appservice.ArchiveFunctionApp("http-python", {
    resourceGroup: linuxResourceGroup,
    plan: linuxPlan,
    archive: new pulumi.asset.FileArchive("./python"),
    appSettings: {
        "runtime": "python",
    },
});

export const dotnetEndpoint = dotnetApp.endpoint.apply(ep => `${ep}HelloDotnet?name=Pulumi`);
export const nodeEndpoint = nodeApp.endpoint.apply(ep => `${ep}HelloNode?name=Pulumi`);
export const powershellEndpoint = powershellApp.endpoint.apply(ep => `${ep}HelloPS?name=Pulumi`);
export const javaEndpoint = javaApp.endpoint.apply(ep => `${ep}HelloJava?name=Pulumi`);
export const pythonEndpoint = pythonApp.endpoint.apply(ep => `${ep}HelloPython?name=Pulumi`);
