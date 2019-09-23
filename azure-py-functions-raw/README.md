[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Functions

Azure Functions created from raw deployment packages in dotnet.

.NET is a precompiled language, and the deployment artifact contains compiled binaries. You will need the following tool to build this projects:

- [.NET Core SDK](https://dotnet.microsoft.com/download) for the .NET Function App

Please remove the corresponding resources from the program in case you don't need those runtimes.

Known issue: [#2784](https://github.com/pulumi/pulumi/issues/2784)&mdash;Python deployment package gets corrupted if deployed from Windows. Workaround: deploy from WSL (Windows Subsystem for Linux), Mac OS, or Linux.

## Running the App

1.  Build and publish the .NET Function App project:

    ```
    $ dotnet publish dotnet
    ```

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Create a Python virtualenv, activate it, and install dependencies:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```
    $ virtualenv -p python3 venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1.  Configure the location to deploy the resources to:

    ```
    $ pulumi config set azure:location <location>
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (dev):
    ...

    Updating (dev):
    ...
    Resources:
        + 7 created
    Duration: 2m42s
    ```

1.  Check the deployed function endpoints:

    ```
    $ pulumi stack output dotnet_endpoint
    https://http-dotnet1a2d3e4d.azurewebsites.net/api/HelloDotnet?name=Pulumi
    $ curl "$(pulumi stack output dotnet_endpoint)"
    Hello from .NET, Pulumi
    ```
