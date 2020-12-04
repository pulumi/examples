[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Synapse Workspace and Pools

Starting point for enterprise analytics solutions based on Azure Synapse.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```
    
1. Set the Azure region location to use:
    
    ```
    $ pulumi config set location westus2
    ```

1. Set the user ID to grant access to (e.g., your current user):
    
    ```
    $ pulumi config set userObjectId $(az ad signed-in-user show --query=objectId | tr -d '"')
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 13 created

    Duration: 10m53s
    ```

1. Navigate to https://web.azuresynapse.net and sign in to your new workspace.
