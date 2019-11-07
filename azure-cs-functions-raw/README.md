[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Functions

Azure Functions created from raw deployment packages in C#.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install .NET Core 3.0+](https://dotnet.microsoft.com/download)

### Steps

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Build and publish the Functions project:

    ```
    $ dotnet publish functions
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
    $ pulumi stack output endpoint
    https://app1a2d3e4d.azurewebsites.net/api/Hello?name=Pulumi
    $ curl "$(pulumi stack output endpoint)"
    Hello, Pulumi
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
