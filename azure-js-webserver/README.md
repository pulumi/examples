[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Web Server Using Azure Virtual Machine

Starting point for building the Pulumi web server sample in Azure.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init webserver-azure-testing
    ```

1.  Configure the app deployment.  The username and password here will be used to configure the Virtual Machine.  The
password must adhere to the [Azure restrictions on VM
passwords](https://docs.microsoft.com/en-us/azure/virtual-machines/windows/faq#what-are-the-password-requirements-when-creating-a-vm).

    ```
    $ pulumi config set azure:environment public
    $ pulumi config set username testuser
    $ pulumi config set --secret password <yourpassword>
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ``` 
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 7 changes performed:
        + 7 resources created
    Update duration: 2m38.391208237s
    ```

1.  Check the IP address:

    ```
    $ pulumi stack output publicIP
    40.112.181.239
    ```

