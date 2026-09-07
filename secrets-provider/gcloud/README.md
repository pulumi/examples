[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/secrets-provider/gcloud/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/secrets-provider/gcloud/README.md#gh-dark-mode-only)

# Pulumi Google Cloud KMS encryption

Pulumi allows you to use KMS encryption from your cloud provider to encrypt any secrets stored in the backend.

This example shows how this might be done for Google Cloud KMS. It creates a storage bucket with a single file that has a "secret" value.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. The gcloud SDK installed, and you should also ensure:
   * You have enabled the Cloud KMS API for your gcloud project.
   * You have enabled billing, which allows you to create a key.
   * You are logged in with the gcloud SDK and have your application-default credentials available at `$HOME/.config/gcloud/application_default_credentials.json`.

## Deploying the example

1. Create a Google Cloud KMS key. When creating your key, be sure to specify permissions that restrict access to only those that need to use the key:

   ```bash
   # First, create a keyring
   gcloud kms keyrings create pulumi-example --location global

   # Then, create a key
   gcloud kms keys create pulumi-secrets  --purpose=encryption --keyring=pulumi-example --location=global --labels app="pulumi",purpose="secrets"

   # Finally, get the key path to use later:
   gcloud kms keys list --format=json --location global --keyring pulumi-example --filter="labels.app=pulumi AND labels.purpose=secrets" | jq -r ".[].name"
   ```

1. Initialize your stack with Pulumi, ensuring you set the `--secrets-provider` flag:

   ```bash
   # Using your keypath, see the kms keys list command above to retrieve it
   pulumi stack init $PULUMI_ORG_NAME/$PULUMI_STACK_NAME --secrets-provider="gcpkms://projects/lbriggs/locations/global/keyRings/pulumi/cryptoKeys/pulumi-secrets"
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
   secretsprovider: gcpkms://projects/lbriggs/locations/global/keyRings/pulumi/cryptoKeys/pulumi-secrets
   encryptedkey: CiQAUsTOmfT2FzRuzaPV1RU8CKUpiNu7Pt349MCgmi/MV4CxMQkSSQCnQvY9rnfYI2baOZPrVzh2WBsjvTEgkTbCCt9NaDJPDIae9tKMMvpSrTQ2C/GC9fmZWFd46yjPWV1lLwVTPiX5Atf5ZchBb0c=
   ```

1. Set your configuration settings:

   ```bash
   # Set the project
   pulumi config set gcp:project $MY_PROJECT
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
   Updating (gcloud-kms):
        Type                         Name                          Status
        pulumi:pulumi:Stack          pulumi-gcloud-kms-gcloud-kms
    +   ├─ gcp:storage:Bucket        bucket                        created
    +   └─ gcp:storage:BucketObject  secret                        created

   Outputs:
     + bucketUrl: "gs://pulumi-lbriggs-kms"
     + secretId : "[secret]"

   Resources:
       + 2 created
       1 unchanged

   Duration: 4s
   ```

   You'll notice the secret value is also omitted from the output!

## Verifying the encryption

A quick way to verify if the encryption is using the gcloud KMS key is to remove your application credentials temporarily:

```bash
gcloud auth application-default revoke
pulumi up
```

```
error: getting secrets manager: open keeper gcpkms://projects/lbriggs/locations/global/keyRings/pulumi/cryptoKeys/pulumi-secrets: google: could not find default credentials. See https://developers.google.com/accounts/docs/application-default-credentials for more information.
```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
