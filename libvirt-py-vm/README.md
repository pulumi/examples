[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/libvirt-py-vm/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/libvirt-py-vm/README.md#gh-dark-mode-only)

# Using the Pulumi Libvirt Provider to Deploy a VM on a KVM Server

Deploys a KVM server in Azure and then deploys a small Linux VM on that KVM server.
It uses the Pulumi Libvirt provider (https://www.pulumi.com/registry/packages/libvirt/) and nested virtualization that is supported by certain Azure instance types to accomplish this.

## Running the App

1. The libvirt provider uses the libvirt module. Therefore, libvirt needs to be installed on the machine from which you are running pulumi.
   - Mac: `brew install libvirt`
   - Windows: See: https://libvirt.org/windows.html
   - Others: https://libvirt.org/downloads.html

1. Create a new stack:

   ```
   $ pulumi stack init dev
   ```

1. Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

   ```
   $ az login
   ```

1. Create a Python virtualenv, activate it, and install dependencies:

   This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

   ```bash
   $ python3 -m venv venv
   $ source venv/bin/activate
   $ pip3 install -r requirements.txt
   ```

1. Set the Azure region location to use:

   ```
   $ pulumi config set azure-native:location westus
   ```

1. Run `pulumi up` to preview and deploy changes:

   ```
   $ pulumi up
   Previewing changes:
   ...

   Performing changes:
   ...
   Resources:
       + 12 created
   Duration: 3m36s
   ```

1. Check the VM on the KVM host:
   The stack generates an output that provides a string you can execute to run `virsh` remotely on the KVM host.
   It will look something like
   ```
   echo virsh list | ssh -i libvirt-ex-dev-kvm_server.priv kvmuser@1.2.3.4
   ```
   Additionally, you can ssh to the KVM host and use virsh locally to explore more details.
