[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-functions-many/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-functions-many/README.md#gh-dark-mode-only)

# Azure Functions in all supported languages

Azure Functions created from raw deployment packages in all supported languages.

.NET and Java are precompiled languages, and the deployment artifact contains compiled binaries. You will need the following tools to build these projects:

- [.NET Core SDK](https://dotnet.microsoft.com/download) for the .NET Function App
- [Apache Maven](https://maven.apache.org/) for the Java Function App

Please remove the corresponding resources from the program in case you don't need those runtimes.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure Credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. [Install the .NET Core SDK](https://dotnet.microsoft.com/download) (for the .NET Function App)
5. [Install Apache Maven](https://maven.apache.org/) (for the Java Function App)

## Deploying the example

1.  Build and publish the .NET Function App project:

    ```bash
    dotnet publish dotnet
    ```

1.  Build and publish the Java Function App project:

    ```bash
    mvn clean package -f java
    ```

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1.  Set the Azure region to deploy into:

    ```bash
    pulumi config set azure-native:location <location>
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):
    ...
    Resources:
        + 20 created
    Duration: 2m42s
    ```

1.  Check the deployed function endpoints:

    ```bash
    pulumi stack output dotnetEndpoint
    curl "$(pulumi stack output dotnetEndpoint)"
    ```

    ```
    https://http-dotnet1a2d3e4d.azurewebsites.net/api/HelloDotnet?name=Pulumi
    Hello from .NET, Pulumi
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
