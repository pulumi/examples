# Pulumi AWS KMS Encryption

Pulumi allows you to use KMS encryption from your cloud provider to encrypt any secrets stored in the backend.

This example shows how this might be done for AWS KMS. It creates an S3 bucket with a single file that has a "secret" value.

# Getting Started

To use this example, perform the following steps. This examples assumes you have the Pulumi CLI installed and the AWS CLI installed.

You should also ensure you have the correct `AWS_PROFILE` set:

```bash
export AWS_PROFILE="myaccount"
```

## Create an AWS KMS Key

```bash
aws kms create-key --tags TagKey=Purpose,TagValue="Pulumi Secret Encryption" --description "Pulumi secret encryption Key"

# Optionally create an alias to this key
aws kms create-alias --alias-name alias/pulumi-encryption --target-key-id $MY_KEY_ID
```

_When creating your key, be sure to specify a sane key policy that restricts access to only those that need to use the key_

## Initialize your stack

Initialize your stack with Pulumi and ensure you set the `--secrets-provider` flag:

```bash
# Using your alias
pulumi stack init $PULUMI_ORG_NAME/$PULUMI_STACK_NAME --secrets-provider="awskms://alias/pulumi-encryption?region=us-west-2"

# Using your key id
pulumi stack init $PULUMI_ORG_NAME/$PULUMI_STACK_NAME --secrets-provider="awskms://1234abcd-12ab-34cd-56ef-1234567890ab?region=us-west-2"
```

## Verify your stack settings

If everything has worked as expected, you should be able to verify in your stack settings that the secretsprovider is set:

```bash
cat Pulumi.$PULUMI_STACK_NAME.yaml
secretsprovider: awskms://alias/pulumi-encryption?region=us-west-2
encryptedkey: AQICAHiGajWxHHTBJxo1FU9BOztzLzxEXpr02SgLetPNGfdfLAG7c5ylmHRJJRz5jtaj2LtzAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMT+iyFkgT4bmdja9WAgEQgDuVYN+iLr6sdyFNGXJS8GfjKiqMBXVvwmn9byd3ywCfJwMsuDnpqAWSmquV5eoLBdPEEOY1D/TuBQuCLQ==
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
Previewing update (aws-kms):
     Type                    Name                    Plan
 +   pulumi:pulumi:Stack     pulumi-aws-kms-aws-kms  create
 +   ├─ aws:s3:Bucket        bucket                  create
 +   └─ aws:s3:BucketObject  secret                  create

Resources:
    + 3 to create

Updating (aws-kms):
     Type                    Name                    Status
 +   pulumi:pulumi:Stack     pulumi-aws-kms-aws-kms  created
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

A quick way to verify if the encryption is using the AWS KMS key is to remove your `AWS_PROFILE` setting:

```bash
unset AWS_PROFILE
pulumi up --yes
error: getting secrets manager: secrets (code=Unknown): InvalidSignatureException: The request signature we calculated does not match the signature you provided. Check your AWS Secret Access Key and signing method. Consult the service documentation for details.
	status code: 400, request id: 35ff51c6-ef88-4c06-9146-361231b8fd4a
```






