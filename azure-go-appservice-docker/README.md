[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-go-appservice-docker/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-go-appservice-docker/README.md#gh-dark-mode-only)

# Azure App Service Running Docker Containers on Linux

Starting point for building web application hosted in Azure App Service from Docker images.

The example shows two scenarios:

- Deploying an existing image from Docker Hub
- Deploying a new custom registry in Azure Container Registry, building a custom Docker image, and running the image from the custom registry

## Running the App

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
    $ pulumi config set azure-native:location westus2
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 8 created

    Duration: 56s
    ```

1.  Check the deployed website endpoint:

    ```
    $ pulumi stack output helloEndpoint
    https://helloappecc2f992.azurewebsites.net
    $ curl "$(pulumi stack output helloEndpoint)"
    <!DOCTYPE html>
    <html>
    <head>
    <title>Welcome to nginx!</title>
    <style>
    html { color-scheme: light dark; }
    body { width: 35em; margin: 0 auto;
    font-family: Tahoma, Verdana, Arial, sans-serif; }
    </style>
    </head>
    <body>
    <h1>Welcome to nginx!</h1>
    <p>If you see this page, the nginx web server is successfully installed and
    working. Further configuration is required.</p>

    <p>For online documentation and support please refer to
    <a href="http://nginx.org/">nginx.org</a>.<br/>
    Commercial support is available at
    <a href="http://nginx.com/">nginx.com</a>.</p>

    <p><em>Thank you for using nginx.</em></p>
    </body>
    </html>



    $ pulumi stack output getStartedEndpoint
    http://get-started-15da13.azurewebsites.net
    $ curl "$(pulumi stack output getStartedEndpoint)"
    <html>
    <body>
    <h1>Your custom docker image is running in Azure App Service!</h1>
    </body>
    </html>
    ```
