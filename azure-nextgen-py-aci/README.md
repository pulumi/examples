[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Container Instances on Linux

Starting point for building web application hosted in Azure Container Instances.

## Running the App

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1. Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    $ az login
    ```

1. Create a Python virtualenv, activate it, and install dependencies:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```bash
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1. Set the azure location in which to run the test:
    
    ```
    $ pulumi config set location westus2
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 3 created

    Duration: 1m18s
    ```

1. Check the deployed endpoint:

    ```
    $ pulumi stack output containerIPv4Address
    13.83.66.37
    $ curl "$(pulumi stack output containerIPv4Address)"
    <html>
    <head>
        <title>Welcome to Azure Container Instances!</title>
    </head>
    ...
    ```
