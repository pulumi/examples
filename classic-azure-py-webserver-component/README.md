[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-py-webserver-component/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-py-webserver-component/README.md#gh-dark-mode-only)

# Web Server Using Azure Virtual Machine with ComponentResource

This example uses `pulumi.ComponentResource` as described [here](https://www.pulumi.com/docs/intro/concepts/resources/#components)
to create and deploy an Azure Virtual Machine and starts a HTTP server on it.

The use of `pulumi.ComponentResource` demonstrates how multiple low-level resources
can be composed into a higher-level, reusable abstraction.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for Azure](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying and running the program

1. Create a new stack:

    ```bash
    $ pulumi stack init
    ```

1. Set the Azure environment:

    ```bash
    $ pulumi config set azure:environment public
    ```

1. Set the required configuration for this example. This example requires you to supply a username and password to
the virtual machine that we are going to create.

    ```bash
    $ pulumi config set username myusername
    ```

    The password is a secret, so we can ask Pulumi to encrypt the configuration:

    ```bash
    $ pulumi config set --secret password Hunter2hunter2
    ```

1. Run `pulumi up` to preview and deploy the changes:

    ```bash
    $ pulumi up
    Previewing update (dev):

        Type                                  Name                              Plan
    +   pulumi:pulumi:Stack                   azure-py-webserver-component-dev  create
    +   ├─ custom:app:WebServer               server                            create
    +   │  ├─ azure:network:PublicIp          server-ip                         create
    +   │  ├─ azure:network:NetworkInterface  server-nic                        create
    +   │  └─ azure:compute:VirtualMachine    server-vm                         create
    +   └─ azure:core:ResourceGroup           server                            create
    +      └─ azure:network:VirtualNetwork    server-network                    create
    +         └─ azure:network:Subnet         server-subnet                     create

    Resources:
        + 8 to create

    Do you want to perform this update? yes
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

1. Get the IP address of the newly-created instance from the stack's outputs:

    ```bash
    $ pulumi stack output public_ip
    13.64.196.146
    ```

1. Check to see that your server is now running:

    ```bash
    $ curl http://$(pulumi stack output public_ip)
    Hello, World!
    ```

1. Destroy the stack:

    ```bash
    $ pulumi destroy -y
    Previewing destroy (dev):

        Type                                  Name                              Plan
    -   pulumi:pulumi:Stack                   azure-py-webserver-component-dev  delete
    -   ├─ custom:app:WebServer               server                            delete
    -   │  ├─ azure:compute:VirtualMachine    server-vm                         delete
    -   │  ├─ azure:network:NetworkInterface  server-nic                        delete
    -   │  └─ azure:network:PublicIp          server-ip                         delete
    -   └─ azure:core:ResourceGroup           server                            delete
    -      └─ azure:network:VirtualNetwork    server-network                    delete
    -         └─ azure:network:Subnet         server-subnet                     delete

    Outputs:
    - public_ip: "13.64.196.146"

    Resources:
        - 8 to delete

    Destroying (dev):

        Type                                  Name                              Status
    -   pulumi:pulumi:Stack                   azure-py-webserver-component-dev  deleted
    -   ├─ custom:app:WebServer               server                            deleted
    -   │  ├─ azure:compute:VirtualMachine    server-vm                         deleted
    -   │  ├─ azure:network:NetworkInterface  server-nic                        deleted
    -   │  └─ azure:network:PublicIp          server-ip                         deleted
    -   └─ azure:core:ResourceGroup           server                            deleted
    -      └─ azure:network:VirtualNetwork    server-network                    deleted
    -         └─ azure:network:Subnet         server-subnet                     deleted

    Outputs:
    - public_ip: "13.64.196.146"

    Resources:
        - 8 deleted

    Duration: 4m28s

    The resources in the stack have been deleted, but the history and configuration associated with the stack are still maintained.
    If you want to remove the stack completely, run 'pulumi stack rm dev'.
    ```
