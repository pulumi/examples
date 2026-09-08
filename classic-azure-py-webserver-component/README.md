[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-py-webserver-component/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-py-webserver-component/README.md#gh-dark-mode-only)

# Web server using Azure Virtual Machine with ComponentResource

This example uses `pulumi.ComponentResource` as described [here](https://www.pulumi.com/docs/intro/concepts/resources/#components)
to create and deploy an Azure Virtual Machine and starts a HTTP server on it.

The use of `pulumi.ComponentResource` demonstrates how multiple low-level resources
can be composed into a higher-level, reusable abstraction.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init
    ```

1. Set the Azure environment and subscription:

    ```bash
    pulumi config set azure:environment public
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    ```

1. Set the required configuration for this example. This example requires you to supply a username and password to
   the virtual machine that we are going to create. The password is a secret, so we ask Pulumi to encrypt the configuration:

    ```bash
    pulumi config set username myusername
    pulumi config set --secret password Hunter2hunter2
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Run `pulumi up` to preview and deploy the changes:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):

        Type                                  Name                              Status
    +   pulumi:pulumi:Stack                   azure-py-webserver-component-dev  created
    +   ├─ custom:app:WebServer               server                            created
    +   │  ├─ azure:network:PublicIp          server-ip                         created
    +   │  ├─ azure:network:NetworkInterface  server-nic                        created
    +   │  └─ azure:compute:VirtualMachine    server-vm                         created
    +   └─ azure:core:ResourceGroup           server                            created
    +      └─ azure:network:VirtualNetwork    server-network                    created
    +         └─ azure:network:Subnet         server-subnet                     created

    Outputs:
        public_ip: "13.64.196.146"

    Resources:
        + 8 created

    Duration: 2m9s
    ```

1. Get the IP address of the newly-created instance from the stack's outputs, and check that your server is running:

    ```bash
    pulumi stack output public_ip
    curl http://$(pulumi stack output public_ip)
    ```

    ```
    13.64.196.146
    Hello, World!
    ```

## Cleaning up

Once you are done, destroy the stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
