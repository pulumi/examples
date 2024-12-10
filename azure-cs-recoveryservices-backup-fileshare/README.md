[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-recoveryservices-backup-fileshare/README.md)

# Azure Files with Azure Recovery Services

This example configures [An example of a backup of an Azure Files using Azure Recovery Services](https://docs.microsoft.com/en-us/azure/backup/azure-file-share-backup-overview).

The following ressources are created:
- Storage Account
    - File Share
- Backup Vault
    - Protection Policy
    - Protection Container to register the Storage Account
    - Protected Item to backup the File Share

**Important note**: The Protected Item must be named using the Azure Recovery Services BackupProtectableItems else it will not work. Unfortunatly at this time Pulumi does not expose the Get BackupProtectableItems this is why the function GetProtectableItemForFileShare is used to fetch it using the Microsoft.Azure.Management.RecoveryServices.Backup library.

https://www.nuget.org/packages/Microsoft.Azure.Management.RecoveryServices.Backup/5.0.0-preview

The pulumi destroy does not complete the first time because there is a delay when the Protection Container is deleted and the lock it automatically place on the Storage Account is removed.
Run it twice and it will work.



## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```
1. Set the Azure region location to use:

    ```
    $ pulumi config set azure-native:location westus
    ```
1. Set the Azure subscription to use:

    ```
    $ pulumi config set azure-native:subscriptionId <subscriptionId>
    ```
1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 9 created
    ```

1.  Check the deployed ressources in Azure Portal
