[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure App Service Running Docker Containers on Linux

Starting point for building web application hosted in Azure App Service from Docker images.

The example shows two scenarios:

- Deploying an existing image from Docker Hub
- Deploying a new custom registry in Azure Container Registry, building a custom Docker image, and running the image from the custom registry

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init azure-appservice-docker
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```
    
1. Set the azure location in which to run the test:
    
    ```
    $ pulumi config set azure:location westus2
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 7 created

    Duration: 4m56s
    ```

1.  Check the deployed endpoints:

    ```
    $ pulumi stack output helloEndpoint
    http://hello-app91dfea21.azurewebsites.net/hello
    $ curl "$(pulumi stack output helloEndpoint)"
    Hello, world!

    $ pulumi stack output getStartedEndpoint
    http://get-started15da1348.azurewebsites.net
    $ curl "$(pulumi stack output getStartedEndpoint)"
    <html>
    <body>
    <h1>Your custom docker image is running in Azure App Service!</h1>
    </body>
    </html>
    ```
