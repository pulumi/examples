# Pulumi Vault Encryption

Pulumi allows you to encrypt any secrets stored in the backend.

This example shows how this might be done for Hashicorp Vault. It creates an S3 bucket with a single file that has a "secret" value.

# Getting Started

To use this example, perform the following steps. This examples assumes you have a working vault server with the [transit secret backend](https://www.vaultproject.io/docs/secrets/transit) enabled.

You should ensure you have an environment variable, `VAULT_SERVER_URL` set to the address of your vault server:

```bash
export VAULT_SERVER_URL="https://vault.service.consul:8201
```

You should also have a [Vault token](https://www.vaultproject.io/docs/concepts/tokens) with a [policy](https://www.vaultproject.io/docs/concepts/policies) that is adequately scoped to allow access to the transit backend.

Once you do, set the `VAULT_SERVER_TOKEN` environment variable:

```bash
export VAULT_SERVER_TOKEN=<token>
```

## Create a Key

We first need to create a key in the transit backend. Assuming it's been enabled at `/transit` we can create the key like so:

```bash

vault write -f transit/keys/my-stack
```

## Initialize your stack

Initialize your stack with Pulumi and ensure you set the `--secrets-provider` flag:

```bash
# Using your alias
pulumi stack init $PULUMI_ORG_NAME/$PULUMI_STACK_NAME --secrets-provider="hashivault://my-stack"

```

## Verify your stack settings

If everything has worked as expected, you should be able to verify in your stack settings that the secretsprovider is set:

```bash
cat Pulumi.$PULUMI_STACK_NAME.yaml
secretsprovider: hashivault://my-stack
encryptedkey: dmF1bHQ6djE6TlhML000T2ZCcWVTSjRmeFhiOVpLeWNmUjErK1k0Wnh6QVhTQm56TXBvZ0dyL2RCQUdEcUFBTHdDUHNIMW8yQkxrVVJNdlNDeDdtbUd2WG0=
```

## Set your configuration settings

```bash
pulumi config set aws:region us-west-2
# Set the bucketname & the secret contents
pulumi config set bucketName pulumi-lbriggs
pulumi config set --secret secretValue "correct-horse-battery-stable"
```

## Create the stack

```bash
# This will create the stack without prompting, be aware!
pulumi up --yes
Previewing update (vault-kms):
     Type                    Name                    Plan
 +   pulumi:pulumi:Stack     pulumi-vault-kms-vault-kms  create
 +   ├─ aws:s3:Bucket        bucket                  create
 +   └─ aws:s3:BucketObject  secret                  create

Resources:
    + 3 to create

Updating (aws-kms):
     Type                    Name                    Status
 +   pulumi:pulumi:Stack     pulumi-vault-kms-vault-kms  created
 +   ├─ aws:s3:Bucket        bucket                  created
 +   └─ aws:s3:BucketObject  secret                  created

Outputs:
    bucketId: "pulumi-lbriggs"
    secretId: "[secret]"

Resources:
    + 3 created

Duration: 8s

Permalink: <redacted>
```

You'll notice the secret value is also omitted from the output!

## Verify the encryption

A quick way to verify if the encryption is using the Vault key is to remove your `VAULT_SERVER_TOKEN` environment variable setting:

```bash
unset 
pulumi up --yes
error: getting secrets manager: secrets (code=Unknown): Error making API request.

URL: PUT http://vault.service.consul:8200/v1/transit/decrypt/my-stack
Code: 400. Errors:

* missing client token
```





