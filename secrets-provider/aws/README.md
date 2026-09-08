[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/secrets-provider/aws/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/secrets-provider/aws/README.md#gh-dark-mode-only)

# Pulumi AWS KMS encryption

Pulumi allows you to use KMS encryption from your cloud provider to encrypt any secrets stored in the backend.

This example shows how this might be done for AWS KMS. It creates an S3 bucket with a single file that has a "secret" value.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. The AWS CLI installed, with the correct `AWS_PROFILE` set:

   ```bash
   export AWS_PROFILE="myaccount"
   ```

## Deploying the example

1. Create an AWS KMS key. When creating your key, be sure to specify a sane key policy that restricts access to only those that need to use the key:

   ```bash
   aws kms create-key --tags TagKey=Purpose,TagValue="Pulumi Secret Encryption" --description "Pulumi secret encryption Key"

   # Optionally create an alias to this key
   aws kms create-alias --alias-name alias/pulumi-encryption --target-key-id $MY_KEY_ID
   ```

1. Initialize your stack with Pulumi, ensuring you set the `--secrets-provider` flag:

   ```bash
   # Using your alias
   pulumi stack init $PULUMI_ORG_NAME/$PULUMI_STACK_NAME --secrets-provider="awskms://alias/pulumi-encryption?region=us-west-2"

   # Using your key id
   pulumi stack init $PULUMI_ORG_NAME/$PULUMI_STACK_NAME --secrets-provider="awskms://1234abcd-12ab-34cd-56ef-1234567890ab?region=us-west-2"
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
   secretsprovider: awskms://alias/pulumi-encryption?region=us-west-2
   encryptedkey: AQICAHiGajWxHHTBJxo1FU9BOztzLzxEXpr02SgLetPNGfdfLAG7c5ylmHRJJRz5jtaj2LtzAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMT+iyFkgT4bmdja9WAgEQgDuVYN+iLr6sdyFNGXJS8GfjKiqMBXVvwmn9byd3ywCfJwMsuDnpqAWSmquV5eoLBdPEEOY1D/TuBQuCLQ==
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
   ```

   You'll notice the secret value is also omitted from the output!

## Verifying the encryption

A quick way to verify if the encryption is using the AWS KMS key is to remove your `AWS_PROFILE` setting:

```bash
unset AWS_PROFILE
pulumi up --yes
```

```
error: getting secrets manager: secrets (code=Unknown): InvalidSignatureException: The request signature we calculated does not match the signature you provided. Check your AWS Secret Access Key and signing method. Consult the service documentation for details.
	status code: 400, request id: 35ff51c6-ef88-4c06-9146-361231b8fd4a
```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
