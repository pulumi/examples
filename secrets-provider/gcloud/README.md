# Pulumi GCloud KMS Encryption

Pulumi allows you to use KMS encryption from your cloud provider to encrypt any secrets stored in the backend.

This example shows how this might be done for GCloud KMS. It creates a storage bucket with a single file that has a "secret" value.

# Getting Started

To use this example, perform the following steps. This examples assumes you have the Pulumi CLI installed and the gcloud SDK installed.

You should also ensure:

  * You have the gcloud SDK installed
  * You have enabled the CloudKMS API for your gcloud project
  * You have enabled billing, which allows you to create a key
  * You are logged in with the gcloud sdk and have your application-default credentials available at `$HOME/.config/gcloud/application_default_credentials.json`

## Create an gcloud KMS Key

```bash
# First, create a keyring
gcloud kms keyrings create pulumi-example --location global

# Then, create a key
gcloud kms keys create pulumi-secrets  --purpose=encryption --keyring=pulumi-example --location=global --labels app="pulumi",purpose="secrets"

# Finally, get the key path to use late:
gcloud kms keys list --format=json --location global --keyring pulumi-example --filter="labels.app=pulumi AND labels.purpose=secrets" | jq -r ".[].name"
```

_When creating your key, be sure to specify a permissions that restricts access to only those that need to use the key_

## Initialize your stack

Initialize your stack with Pulumi and ensure you set the `--secrets-provider` flag:

```bash
# Using your keypath, see the kms keys list command above to retrieve it
pulumi stack init $PULUMI_ORG_NAME/$PULUMI_STACK_NAME --secrets-provider="gcpkms://projects/lbriggs/locations/global/keyRings/pulumi/cryptoKeys/pulumi-secrets"
```

## Verify your stack settings

If everything has worked as expected, you should be able to verify in your stack settings that the secretsprovider is set:

```bash
cat Pulumi.$PULUMI_STACK_NAME.yaml
secretsprovider: gcpkms://projects/lbriggs/locations/global/keyRings/pulumi/cryptoKeys/pulumi-secrets
encryptedkey: CiQAUsTOmfT2FzRuzaPV1RU8CKUpiNu7Pt349MCgmi/MV4CxMQkSSQCnQvY9rnfYI2baOZPrVzh2WBsjvTEgkTbCCt9NaDJPDIae9tKMMvpSrTQ2C/GC9fmZWFd46yjPWV1lLwVTPiX5Atf5ZchBb0c=
```

## Set your configuration settings

```bash
# Set the project
pulumi config set gcp:project $MY_PROJECT
# Set the bucketname & the secret contents
pulumi config set bucketName pulumi-lbriggs
pulumi config set --secret secretValue "correct-horse-battery-stable"
```

## Create the stack

```bash
# This will create the stack without prompting, be aware!
pulumi up --yes                                                                                                  home.lbrlabs/default ⎈
Previewing update (gcloud-kms):
     Type                         Name                          Plan
     pulumi:pulumi:Stack          pulumi-gcloud-kms-gcloud-kms
 +   ├─ gcp:storage:Bucket        bucket                        create
 +   └─ gcp:storage:BucketObject  secret                        create

Outputs:
  + bucketUrl: output<string>
  + secretId : "[secret]"

Resources:
    + 2 to create
    1 unchanged

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

Permalink: https://app.pulumi.com/jaxxstorm/pulumi-gcloud-kms/gcloud-kms/updates/2
```

You'll notice the secret value is also omitted from the output!

## Verify the encryption

A quick way to verify if the encryption is using the gcloud KMS key is to remove your application credentials temporarily:

_NOTE: I'm sure there's a better way? PR's welcome_

```bash
gcloud auth application-default revoke
pulumi up
error: getting secrets manager: open keeper gcpkms://projects/lbriggs/locations/global/keyRings/pulumi/cryptoKeys/pulumi-secrets: google: could not find default credentials. See https://developers.google.com/accounts/docs/application-default-credentials for more information.
```






