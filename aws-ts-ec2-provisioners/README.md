[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-ec2-provisioners/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-ec2-provisioners/README.md#gh-dark-mode-only)

# AWS web server with manual provisioning

This demonstrates using the [`@pulumi/command`](https://www.pulumi.com/registry/packages/command/) package to accomplish post-provisioning configuration steps.

Using these building blocks, one can accomplish much of the same as Terraform provisioners.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Generate an OpenSSH keypair for use with your server, as per the AWS [requirements](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html#how-to-generate-your-own-key-and-import-it-to-aws):

    ```bash
    ssh-keygen -t rsa -f rsa -m PEM
    ```

    This will output two files, `rsa` and `rsa.pub`, in the current directory. Be sure not to commit these files!

1.  Configure the stack so that the public key is used by your EC2 instance, and the private key is used for the subsequent SCP and SSH steps that configure your server after it is stood up:

    ```bash
    cat rsa.pub | pulumi config set publicKey --
    cat rsa | pulumi config set privateKey --secret --
    ```

    Notice that we've used `--secret` for `privateKey`. This ensures the private key is stored as an encrypted [Pulumi secret](https://www.pulumi.com/docs/intro/concepts/secrets/).

1.  Set your desired AWS region:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1.  Deploy the stack. All resources will be provisioned and configured:

    ```bash
    pulumi up
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring further charges:

```bash
pulumi destroy
pulumi stack rm
```
