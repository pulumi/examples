[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/secrets-provider/azure/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/secrets-provider/azure/README.md#gh-dark-mode-only)

# Pulumi Azure Key Vault encryption

Pulumi allows you to use Azure Key Vault encryption from your cloud provider to encrypt any secrets stored in the backend.

This example shows how this might be done for Azure Key Vault. It creates a storage bucket with a single file that has a "secret" value.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. The Azure CLI installed, and you should also ensure:
   * You are logged in via the `az` command line tool.
   * You have created a resource group.
   * You have the environment variable `AZURE_KEYVAULT_AUTH_VIA_CLI` set to `true`, e.g. `export AZURE_KEYVAULT_AUTH_VIA_CLI=true`.

## Deploying the example

1. Create an Azure Key Vault key. When creating your key, be sure to specify permissions that restrict access to only those that need to use the key.

   > `$YOUR_OBJECT_ID` in this case corresponds to the object ID of the Azure ServicePrincipal or account currently logged into the `az` CLI. You will likely need to run a ` az ad sp show --id {app id} | jq -r .objectId` or `az ad user show --id {user id}` query to get this value.

   ```bash
   # First, create a keyvault
   az keyvault create -l westus -n pulumi --resource-group $RESOURCE_GROUP_NAME

   # Then, create a key
   az keyvault key create --name pulumi-secret --vault-name pulumi

   # Finally, set the relevant permissions on the keyvault
   az keyvault set-policy --name pulumi --object-id $YOUR_OBJECT_ID --key-permissions decrypt get create delete list update import backup restore recover encrypt
   ```

1. Initialize your stack with Pulumi, ensuring you set the `--secrets-provider` flag:

   ```bash
   # Using your vault and key name
   pulumi stack init $PULUMI_ORG_NAME/$PULUMI_STACK_NAME --secrets-provider="azurekeyvault://pulumi.vault.azure.net/keys/pulumi-secret"
   ```

1. Install dependencies:

   ```bash
   npm install
   ```

1. Verify your stack settings. If everything has worked as expected, you should be able to verify in your stack settings that the secrets provider is set:

   ```bash
   cat Pulumi.$PULUMI_STACK_NAME.yaml
   ```

   ```
   secretsprovider: azurekeyvault://pulumi.vault.azure.net/keys/pulumi-secret/b636b47f2b474b2a8de3526561eae81b
   encryptedkey: Q2U5a1ZuTWsxLXVWOFdhVEdfaGExdWR1SzhzTlVFMldhWGlxU3RJVVdUWFJBcmM4M1ZlYzZOVVlpU3J2dW1NX2RIelMwV1h4el9hSjFibjcwdjVXcEgxZVlFa2c1LTlGUTBwX2ZnamcyNXh0V2RnYXlKaUNWSzd0VmlhY0ZyT2NCNGJ2SG40NkE4OFR2d0NWVzVEOUZOaUpGNm03TTlLUEl4VC0tbG9fYUJSSUlrZDJuUmNxVTJ2cWxDUjYtdVJYYjJKUjFoTlRYYkNaaEVTUzY4dGtNajZNRXBOQ1k4OGc4d0RTeUVBVGhweEswbUVXc3RaaGUtdnpQdktVY2tFUGFCVkdOaHZHOU1SYU91RWJ6QVZnLUtVdExHYlFHd19vUU15T3I4d3ZvajdJQ0liS0QtUTNLY0h4Q0JsMGNjd1A5ZXNWRUNNQ0tQZGhPY1cySTJwU1BR
   ```

1. Set your configuration settings:

   ```bash
   pulumi config set azure:location westus
   # Set the bucketname & the secret contents
   pulumi config set bucketName pulumilbriggs
   pulumi config set --secret secretValue "correct-horse-battery-stable"
   ```

1. Create the stack:

   ```bash
   # This will create the stack without prompting, be aware!
   pulumi up --yes
   ```

   ```
   Updating (azure-keyvault):
        Type                         Name                                  Status
        pulumi:pulumi:Stack          pulumi-azure-keyvault-azure-keyvault
    +   ├─ azure:core:ResourceGroup  resourceGroup                         created
    +   ├─ azure:storage:Account     storage                               created
    +   ├─ azure:storage:Container   container                             created
    +   └─ azure:storage:Blob        blob                                  created

   Outputs:
     + connectionString: "DefaultEndpointsProtocol=https;AccountName=pulumilbriggs;AccountKey=Efa63L/xDstQgyvgsYHZqzl3oIlQA4scS4NeX/O1TeBI3mbwMcKxiHIkAGkwJj21EPzHebiuAUM09i7dVv3f/A==;EndpointSuffix=core.windows.net"

   Resources:
       + 4 created
       1 unchanged

   Duration: 31s
   ```

   You'll notice the secret value is also omitted from the output!

## Verifying the encryption

A quick way to verify if the encryption is using the Azure Key Vault key is to remove your application credentials temporarily:

```bash
unset AZURE_KEYVAULT_AUTH_VIA_CLI
```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
