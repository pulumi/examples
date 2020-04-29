[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Functions

Azure Functions created from raw deployment packages in C#.

C# is a precompiled language, and the deployment artifact contains compiled binaries. You will need the following tool to build this project:

- [.NET Core SDK](https://dotnet.microsoft.com/download) for the .NET Function App

Please remove the corresponding resources from the program in case you don't need those runtimes.

## Running the App

1. Build and publish the .NET Function App project:

    ```bash
    $ dotnet publish dotnet
    ```

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1. Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    $ az login
    ```

1. Create a Python virtualenv, activate it, and install dependencies:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```bash
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1. Configure the location to deploy the resources to:

    ```bash
    $ pulumi config set azure:location <location>
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
    Previewing update (dev):
    ...

    Updating (dev):
    ...
    Resources:
        + 7 created
    Duration: 2m42s
    ```

1. Check the deployed function endpoints:

    ```bash
    $ pulumi stack output dotnet_endpoint
    https://http-dotnet1a2d3e4d.azurewebsites.net/api/HelloDotnet?name=Pulumi
    $ curl "$(pulumi stack output dotnet_endpoint)"
    Hello from .NET, Pulumi
    ```
