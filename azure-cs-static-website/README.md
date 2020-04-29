[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Static Website Using Azure Blob Storage

This example configures [Static website hosting in Azure Storage](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website). One complication is the fact that the Static Website feature of Storage Accounts is not part of Azure Resource Manager, and is not configurable directly via Pulumi Azure provider.

As a workaround we use the Azure storage SDK to enable the feature directly in the C# code, while still providing the Pulumi experience and lifecycle management.


## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

2.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

3.  Restore dotnet dependencies

    ```
    $ dotnet restore
    ```

4.  Run `pulumi up` to preview and deploy changes:

    ``` 
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Outputs:
        StaticEndpoint: "https://mysitebc97f8a0.z6.web.core.windows.net/"

    Resources:
        + 5 created

    Duration: 30s
    ```

5.  Check the deployed website endpoint:

    ```
    $ pulumi stack output StaticEndpoint
    https://mysitebc97f8a0.z6.web.core.windows.net/
    $ curl "$(pulumi stack output StaticEndpoint)"
    <html>
        <body>
            <h1>This file is served from Blob Storage</h1>
        </body>
    </html>
    ```
