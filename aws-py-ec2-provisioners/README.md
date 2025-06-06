[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-ec2-provisioners/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-ec2-provisioners/README.md#gh-dark-mode-only)

# AWS WebServer with Manual Provisioning (in Python)

This demonstrates using the [`pulumi_command`](https://www.pulumi.com/registry/packages/command/) package to accomplish post-provisioning configuration steps.

Using these building blocks, one can accomplish much of the same as Terraform provisioners.

## Running the Example

First, create a stack, using `pulumi stack init`.

Next, generate an OpenSSH keypair for use with your server - as per the AWS [Requirements][1]

```
$ ssh-keygen -t rsa -f rsa -b 4096 -m PEM
```

This will output two files, `rsa` and `rsa.pub`, in the current directory. Be sure not to commit these files!

We then need to configure our stack so that the public key is used by our EC2 instance, and the private key used
for subsequent SCP and SSH steps that will configure our server after it is stood up.

```
$ cat rsa.pub | pulumi config set publicKey --
$ cat rsa | pulumi config set privateKey --secret --
```

Notice that we've used `--secret` for `privateKey`. This ensures the private key is stored as an encrypted [Pulumi secret](https://www.pulumi.com/docs/intro/concepts/secrets/).

Also set your desired AWS region:

```
$ pulumi config set aws:region us-west-2
```

From there, you can run `pulumi up` and all resources will be provisioned and configured.

[1]: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html#how-to-generate-your-own-key-and-import-it-to-aws
