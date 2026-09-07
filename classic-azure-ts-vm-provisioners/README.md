[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-vm-provisioners/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-vm-provisioners/README.md#gh-dark-mode-only)

# Azure web server with manual provisioning

This demonstrates using the [`@pulumi/command`](https://www.pulumi.com/registry/packages/command/) package to accomplish post-provisioning configuration steps.

Using these building blocks, one can accomplish much of the same as Terraform provisioners.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Set the config for login credentials and location information:

    ```bash
    pulumi config set azure:location westus
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    pulumi config set username <your_username>
    pulumi config set password --secret <your_desired_password>
    ```

1. Generate an OpenSSH keypair for use with your server, as per the Azure [requirements][1]:

    ```bash
    ssh-keygen -t rsa -f rsa -m PEM
    ```

    This will output two files, `rsa` and `rsa.pub`, in the current directory. Be sure not to commit these files!

1. Configure your stack so that the public key is used by your VM, and the private key is used for subsequent SCP and SSH steps to configure your server after it is stood up. Note that using `--secret` for `privateKey` ensures the private key is stored as an encrypted [Pulumi secret](https://www.pulumi.com/docs/intro/concepts/secrets/).

    ```bash
    cat rsa.pub | pulumi config set publicKey --
    cat rsa | pulumi config set privateKey --secret --
    ```

1. Install dependencies:

    ```bash
    npm install
    ```

1. Deploy the stack. All resources will be provisioned and configured:

    ```bash
    pulumi up
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```

[1]: https://docs.microsoft.com/en-us/azure/virtual-machines/linux/ssh-from-windows#create-an-ssh-key-pair
