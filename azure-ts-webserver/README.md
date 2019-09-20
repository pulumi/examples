[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Web Server Using Azure Virtual Machine

This example provisions a Linux web server in an Azure Virtual Machine and gives it a public IP address.

## Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- [Download and install the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Connect Pulumi with your Azure account](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/) (if your `az` CLI is
      configured, this will just work)

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Configure the app deployment. The username and password here will be used to configure the Virtual Machine. The
    password must adhere to the [Azure restrictions on VM passwords](
    https://docs.microsoft.com/en-us/azure/virtual-machines/windows/faq#what-are-the-password-requirements-when-creating-a-vm).

    ```
    $ pulumi config set azure:location westus    # any valid Azure region will do
    $ pulumi config set username webmaster
    $ pulumi config set password <your-password> --secret
    ```

    Note that `--secret` ensures your password is encrypted safely.

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
    Update duration: 2m38s
    ```

1.  Check the IP address:

    ```
    $ pulumi stack output ipAddress
    40.112.181.239
    ```
