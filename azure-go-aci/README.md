[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Custom Docker Image running in Azure Container Instances

Starting point for building web application hosted in Azure Container Instances.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Azure](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)

### Steps

1.  Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    $ az login
    ```

1.  Configure the location to deploy the resources to:

    ```bash
    $ pulumi config set azure:location <location>
    ```

1. Restore your Go dependencies. This example currently uses [Dep](https://github.com/golang/dep) to do so:

    ```bash
    $ dep ensure
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
    ...

1.  Check the deployed container endpoint:

    ```
    $ pulumi stack output endpoint
    acigo.westus.azurecontainer.io
    $ curl "$(pulumi stack output endpoint)"
    <html>
    <head><meta charset="UTF-8">
    <title>Hello, Pulumi!</title></head>
    <body>
        <p>Hello, containers!</p>
        <p>Made with ❤️ with <a href="https://pulumi.com">Pulumi</a></p>
    </body></html>
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
