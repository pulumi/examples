[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-webserver/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-webserver/README.md#gh-dark-mode-only)

# Web Server Using Azure Virtual Machine

This example deploys an Azure Virtual Machine and starts an HTTP server on it.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for Azure](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying and running the program

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1. Set the required configuration for this example. This example requires you to supply a username and password to the virtual machine that we are going to create.

    ```
    $ pulumi config set azure-native:location westus    # any valid Azure region will do
    $ pulumi config set username webmaster
    $ pulumi config set password --secret <your-password>
    ```

    Note that `--secret` ensures your password is encrypted safely.


1. Run `pulumi up` to preview and deploy the changes:

    ```
    $ pulumi update
    Previewing update (azuredev):

        Type                                      Name                         Plan
    +   pulumi:pulumi:Stack                       azure-py-webserver-azuredev  create
    +   ├─ azure-native:core:ResourceGroup        server                       create
    +   ├─ azure-native:network:VirtualNetwork    server-network               create
    +   ├─ azure-native:network:PublicIp          server-ip                    create
    +   ├─ azure-native:network:Subnet            server-subnet                create
    +   ├─ azure-native:network:NetworkInterface  server-nic                   create
    +   └─ azure-native:compute:VirtualMachine    server-vm                    create

    Resources:
        + 7 to create

    Do you want to perform this update? yes
    Updating (azuredev):

        Type                                      Name                         Status
    +   pulumi:pulumi:Stack                       azure-py-webserver-azuredev  created
    +   ├─ azure-native:core:ResourceGroup        server                       created
    +   ├─ azure-native:network:VirtualNetwork    server-network               created
    +   ├─ azure-native:network:PublicIp          server-ip                    created
    +   ├─ azure-native:network:Subnet            server-subnet                created
    +   ├─ azure-native:network:NetworkInterface  server-nic                   created
    +   └─ azure-native:compute:VirtualMachine    server-vm                    created

    Outputs:
        public_ip: "137.117.15.111"

    Resources:
        + 7 created

    Duration: 2m55s

    Permalink: https://app.pulumi.com/swgillespie/azure-py-webserver/azuredev/updates/3
    ```

1. Get the IP address of the newly-created instance from the stack's outputs:

    ```bash
    $ pulumi stack output public_ip
    137.117.15.111
    ```

1. Check to see that your server is now running:

    ```
    $ curl http://$(pulumi stack output public_ip)
    Hello, World!
    ```

1. Destroy the stack:

    ```bash
    ▶ pulumi destroy --yes
    Previewing destroy (azuredev):

        Type                                      Name                         Plan
    -   pulumi:pulumi:Stack                       azure-py-webserver-azuredev  delete
    -   ├─ azure-native:compute:VirtualMachine    server-vm                    delete
    -   ├─ azure-native:network:NetworkInterface  server-nic                   delete
    -   ├─ azure-native:network:Subnet            server-subnet                delete
    -   ├─ azure-native:network:PublicIp          server-ip                    delete
    -   ├─ azure-native:network:VirtualNetwork    server-network               delete
    -   └─ azure-native:core:ResourceGroup        server                       delete

    Resources:
        - 7 to delete

    Destroying (azuredev):

        Type                                      Name                         Status
    -   pulumi:pulumi:Stack                       azure-py-webserver-azuredev  deleted
    -   ├─ azure-native:compute:VirtualMachine    server-vm                    deleted
    -   ├─ azure-native:network:NetworkInterface  server-nic                   deleted
    -   ├─ azure-native:network:Subnet            server-subnet                deleted
    -   ├─ azure-native:network:VirtualNetwork    server-network               deleted
    -   ├─ azure-native:network:PublicIp          server-ip                    deleted
    -   └─ azure-native:core:ResourceGroup        server                       deleted

    Resources:
        - 7 deleted

    Duration: 3m49s

    Permalink: https://app.pulumi.com/swgillespie/azure-py-webserver/azuredev/updates/4
    ```
