[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure App Service Running Docker Containers on Linux

Starting point for building a web application hosted in Azure App Service from Docker images.

The example deploys an existing image from Docker Hub

## Running the App

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1. Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    $ az login
    ```

1. Specify the Azure location to use:

    ```bash
    $ pulumi config set azure:location WestUS
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 4 created

    Duration: 4m56s
    ```

1. Check the deployed endpoints:

    ```bash
    $ pulumi stack output hello_endpoint
    http://hello-app91dfea21.azurewebsites.net/hello
    $ curl "$(pulumi stack output hello_endpoint)"
    Hello, world!
    ```
