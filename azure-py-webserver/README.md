[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Web Server example in Python

This example deploys an Azure Virtual Machine and starts a HTTP server on it.

## Prerequisites

1. [Install Pulumi](https://pulumi.io/install/)
1. [Configure Pulumi for Azure](https://pulumi.io/quickstart/azure/setup.html)
1. [Configure Pulumi for Python](https://pulumi.io/reference/python.html)

## Deploying and running the program

1. Set up a virtual Python environment and install dependencies

    ```
    $ virtualenv -p python3 venv
    $ source venv/bin/activate
    $ pip install -r requirements.txt
    ```

1. Create a new stack:

    ```
    $ pulumi stack init azure-py-webserver
    ```

1. Set the Azure environment:

    ```
    $ pulumi config set azure:environment public
    ```

1. Set the required configuration for this example. This example requires you to supply a username and password to
the virtual machine that we are going to create.

    ```
    $ pulumi config set azure-web:username myusername
    ```

The password is a secret, so we can ask Pulumi to encrypt the configuration:

    ```
    $ pulumi config set --secret azure-web:password Hunter2hunter2
    ```

1. Run `pulumi up` to preview and deploy the changes:

    ```
    ... fill in when not broken ...
    ```