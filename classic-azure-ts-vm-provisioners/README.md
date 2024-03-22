[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-vm-provisioners/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-vm-provisioners/README.md#gh-dark-mode-only)

# Azure WebServer with Manual Provisioning

This demonstrates using the [`@pulumi/command`](https://www.pulumi.com/registry/packages/command/) package to accomplish post-provisioning configuration steps.

Using these building blocks, one can accomplish much of the same as Terraform provisioners.

## Running the Example

First, create a stack, using `pulumi stack init`.

Now, we need to ensure that our dependencies are installed:

```
$ npm install
```


You'll need to log in to the azure cli. You will be prompted to do this during deployment if you forget this step.

```
$ az login
```

We'll need to set some config for login credentials, and location information.

```
pulumi config set azure:location westus
pulumi config set username <your_username>
pulumi config set password --secret <your_desired_password>

```

Next, generate an OpenSSH keypair for use with your server - as per the Azure [Requirements][1]

```
$ ssh-keygen -t rsa -f rsa -m PEM
```

This will output two files, `rsa` and `rsa.pub`, in the current directory. Be sure not to commit these files!

We then need to configure our stack so that the public key is used by our VM, and the private key used
for subsequent SCP and SSH steps to configure our server after it is stood up.

```
$ cat rsa.pub | pulumi config set publicKey --
$ cat rsa | pulumi config set privateKey --secret --
```

Notice that we've used `--secret` for `privateKey`. This ensures the private key is stored as an encrypted [Pulumi secret](https://www.pulumi.com/docs/intro/concepts/secrets/).

From there, you can run `pulumi up` and all resources will be provisioned and configured.

[1]: https://docs.microsoft.com/en-us/azure/virtual-machines/linux/ssh-from-windows#create-an-ssh-key-pair
