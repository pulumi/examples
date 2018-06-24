# Pulumi web server (Azure)

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
    $ pulumi config set webserver-azure:username testuser
    $ pulumi config set --secret webserver-azure:password <yourpassword>
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Install dependencies:

    ```
    $ pip install -r requirements.txt
    ```

1.  Run `pulumi update` to preview and deploy changes:

    ``` 
    $ pulumi update
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 9 changes performed:
        + 9 resources created
    Update duration: 2m40.391208237s
    ```

1.  Check the IP address:

    ```
    $ pulumi stack output private_ip
    10.0.2.4
    ```

*TODO*: Expose the Public IP address as well so that the VM can be SSH'd into or CURL'd directly.
