[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

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
   
1. Set the azure location in which to run the test:
    
    ```
    $ pulumi config set location westus2
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
    $ pulumi stack output endpoint
    https://azpulumi-as0ef47193.azurewebsites.net
    $ curl "$(pulumi stack output endpoint)"
    <html>
        <body>
            <h1>Greetings from Azure App Service!</h1>
        </body>
    </html>
    ```
