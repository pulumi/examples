[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/secrets-provider/vault/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/secrets-provider/vault/README.md#gh-dark-mode-only)

# Pulumi Vault encryption

Pulumi allows you to encrypt any secrets stored in the backend.

This example shows how this might be done for HashiCorp Vault. It creates an S3 bucket with a single file that has a "secret" value.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. A working Vault server with the [transit secret backend](https://www.vaultproject.io/docs/secrets/transit) enabled. Set the `VAULT_SERVER_URL` environment variable to the address of your Vault server:

   ```bash
   export VAULT_SERVER_URL="https://vault.service.consul:8201"
   ```

   You should also have a [Vault token](https://www.vaultproject.io/docs/concepts/tokens) with a [policy](https://www.vaultproject.io/docs/concepts/policies) that is adequately scoped to allow access to the transit backend. Set the `VAULT_SERVER_TOKEN` environment variable:

   ```bash
   export VAULT_SERVER_TOKEN=<token>
   ```

## Deploying the example

1. Create a key in the transit backend. Assuming it's been enabled at `/transit`, create the key like so:

   ```bash
   vault write -f transit/keys/my-stack
   ```

1. Initialize your stack with Pulumi, ensuring you set the `--secrets-provider` flag:

   ```bash
   pulumi stack init $PULUMI_ORG_NAME/$PULUMI_STACK_NAME --secrets-provider="hashivault://my-stack"
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
   secretsprovider: hashivault://my-stack
   encryptedkey: dmF1bHQ6djE6TlhML000T2ZCcWVTSjRmeFhiOVpLeWNmUjErK1k0Wnh6QVhTQm56TXBvZ0dyL2RCQUdEcUFBTHdDUHNIMW8yQkxrVVJNdlNDeDdtbUd2WG0=
   ```

1. Set your configuration settings:

   ```bash
   pulumi config set aws:region us-west-2
   # Set the bucketname & the secret contents
   pulumi config set bucketName pulumi-lbriggs
   pulumi config set --secret secretValue "correct-horse-battery-stable"
   ```

1. Create the stack:

   ```bash
   # This will create the stack without prompting, be aware!
   pulumi up --yes
   ```

   ```
   Updating (vault-kms):
        Type                    Name                        Status
    +   pulumi:pulumi:Stack     pulumi-vault-kms-vault-kms  created
    +   ├─ aws:s3:Bucket        bucket                      created
    +   └─ aws:s3:BucketObject  secret                      created

   Outputs:
       bucketId: "pulumi-lbriggs"
       secretId: "[secret]"

   Resources:
       + 3 created

   Duration: 8s
   ```

   You'll notice the secret value is also omitted from the output!

## Verifying the encryption

A quick way to verify if the encryption is using the Vault key is to remove your `VAULT_SERVER_TOKEN` environment variable setting:

```bash
unset VAULT_SERVER_TOKEN
pulumi up --yes
```

```
error: getting secrets manager: secrets (code=Unknown): Error making API request.

URL: PUT http://vault.service.consul:8200/v1/transit/decrypt/my-stack
Code: 400. Errors:

* missing client token
```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
