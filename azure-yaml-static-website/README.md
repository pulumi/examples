[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-static-website/README.md)

# Static Website Using Azure Blob Storage and CDN

This example configures [Static website hosting in Azure Storage](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website).

In addition to the Storage itself, a CDN is configured to serve files from the Blob container origin. This may be useful if you need to serve files via HTTPS from a custom domain (not shown in the example).

## Running the App

1.  Install required plugins:

    ```bash
    $ pulumi plugin install resource azure-native 1.56.0
    ```

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1. Set the Azure region location to use:

    ```
    $ pulumi config set azure-native:location westus
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 9 created
    Duration: 2m52s
    ```

1.  Check the deployed website endpoint:

    ```
    $ pulumi stack output endpoint
    https://websitesbc90978a1.z20.web.core.windows.net/
    $ curl "$(pulumi stack output endpoint)"
    <html>

    <head>
        <meta charset="UTF-8">
        <title>Hello, Pulumi!</title>
        <link href="favicon.png" rel="icon" type="image/png" />
    </head>

    <body>
        <h1>Hello, Azure!</h1>
        <p>Made with ❤️ with <a href="https://pulumi.com">Pulumi</a></p>
        <p>This file is served from Azure Blob Storage.</p>
    </body>

    </html>
    ```
