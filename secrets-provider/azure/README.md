# Pulumi Azure KMS Encryption

Pulumi allows you to use Azure Keyvault encryption from your cloud provider to encrypt any secrets stored in the backend.

This example shows how this might be done for Azure Keyvault. It creates a storage bucket with a single file that has a "secret" value.

# Getting Started

To use this example, perform the following steps. This examples assumes you have the pulumi-cli installed and the Azure CLI installed.

You should also ensure:

  * You azure command line tool installed
  * You are logging in via the `az` command line tool.
  * You have created a resource-group
  * You must have the environment variable `AZURE_KEYVAULT_AUTH_VIA_CLI` set to `true` eg: `export AZURE_KEYVAULT_AUTH_VIA_CLI=true`

## Create an Azure Keyvault Key

> `$YOUR_OBJECT_ID` in this case corresponds to the object ID of the Azure ServicePrincipal or account currently logged into the `az` CLI. You will likely need to run a ` az ad sp show --id {app id} | jq -r .objectId` or `az ad user show --id {user id}` query to get this value.

```bash
# First, create a keyvault
az keyvault create -l westus -n pulumi --resource-group $RESOURCE_GROUP_NAME

# Then, create a key
az keyvault key create --name pulumi-secret --vault-name pulumi

# Finally, set the relevant permissions on the keyvault
az keyvault set-policy --name pulumi --object-id $YOUR_OBJECT_ID --key-permissions decrypt get create delete list update import backup restore recover encrypt
```

_When creating your key, be sure to specify a permissions that restricts access to only those that need to use the key_

## Initialize your stack

Initialize your stack with Pulumi and ensure you set the `--secrets-provider` flag:

```bash
# Using your vault and key name
pulumi stack init $PULUMI_ORG_NAME/$PULUMI_STACK_NAME --secrets-provider="azurekeyvault://pulumi.vault.azure.net/keys/pulumi-secret"
```

## Verify your stack settings

If everything has worked as expected, you should be able to verify in your stack settings that the secretsprovider is set:

```bash
cat Pulumi.$PULUMI_STACK_NAME.yaml
secretsprovider: azurekeyvault://pulumi.vault.azure.net/keys/pulumi-secret/b636b47f2b474b2a8de3526561eae81b
encryptedkey: Q2U5a1ZuTWsxLXVWOFdhVEdfaGExdWR1SzhzTlVFMldhWGlxU3RJVVdUWFJBcmM4M1ZlYzZOVVlpU3J2dW1NX2RIelMwV1h4el9hSjFibjcwdjVXcEgxZVlFa2c1LTlGUTBwX2ZnamcyNXh0V2RnYXlKaUNWSzd0VmlhY0ZyT2NCNGJ2SG40NkE4OFR2d0NWVzVEOUZOaUpGNm03TTlLUEl4VC0tbG9fYUJSSUlrZDJuUmNxVTJ2cWxDUjYtdVJYYjJKUjFoTlRYYkNaaEVTUzY4dGtNajZNRXBOQ1k4OGc4d0RTeUVBVGhweEswbUVXc3RaaGUtdnpQdktVY2tFUGFCVkdOaHZHOU1SYU91RWJ6QVZnLUtVdExHYlFHd19vUU15T3I4d3ZvajdJQ0liS0QtUTNLY0h4Q0JsMGNjd1A5ZXNWRUNNQ0tQZGhPY1cySTJwU1BR

```

## Set your configuration settings

```bash
pulumi config set azure:location westus
# Set the bucketname & the secret contents
pulumi config set bucketName pulumilbriggs
pulumi config set --secret secretValue "correct-horse-battery-stable"
```

## Create the stack

```bash
# This will create the stack without prompting, be aware!
Previewing update (azure-keyvault):
     Type                         Name                                  Plan
     pulumi:pulumi:Stack          pulumi-azure-keyvault-azure-keyvault
 +   ├─ azure:core:ResourceGroup  resourceGroup                         create
 +   ├─ azure:storage:Account     storage                               create
 +   ├─ azure:storage:Container   container                             create
 +   └─ azure:storage:Blob        blob                                  create

Outputs:
  + connectionString: output<string>

Resources:
    + 4 to create
    1 unchanged

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

Permalink: https://app.pulumi.com/jaxxstorm/pulumi-azure-keyvault/azure-keyvault/updates/3
```

You'll notice the secret value is also omitted from the output!

## Verify the encryption

A quick way to verify if the encryption is using the Azure Keyvault key is to remove your application credentials temporarily:

```
unset AZURE_KEYVAULT_AUTH_VIA_CLI
```
