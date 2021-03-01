[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Functions in Python

Azure Functions developed and deployed with Python.

## Running the App

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1. Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    $ az login
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
    $ pulumi stack output endpoint
    https://http1a2d3e4d.azurewebsites.net/api/HelloPython?name=Pulumi
    $ curl "$(pulumi stack output endpoint)"
    Hello from Python, Pulumi!
    ```
