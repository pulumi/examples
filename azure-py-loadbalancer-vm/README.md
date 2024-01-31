[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-loadbalancer-vm/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-loadbalancer-vm/README.md#gh-dark-mode-only)

# Load Balancer and Web Server Using Azure Load Balancer and Virtual Machine

This example deploys an Azure Load Balancer fronting an Azure Virtual Machine and starts an HTTP server on the VM.

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

        Type                                           Name                                        Plan
     +  pulumi:pulumi:Stack                            azure-py-loadbalancer-vm-azuredev           create
     +   ├─ random:index:RandomString                  azure-py-loadbalancer-vm-lb-domain-label    create
     +   ├─ azure-native:resources:ResourceGroup       azure-py-loadbalancer-vm-resource-group     create
     +   ├─ azure-native:network:VirtualNetwork        azure-py-loadbalancer-vm-network            create
     +   ├─ azure-native:network:NetworkSecurityGroup  azure-py-loadbalancer-vm-security-group     create
     +   ├─ azure-native:network:PublicIPAddress       azure-py-loadbalancer-vm-lb-public-ip       create
     +   ├─ azure-native:network:LoadBalancer          azure-py-loadbalancer-vm-lb                 create
     +   ├─ azure-native:network:NetworkInterface      azure-py-loadbalancer-vm-network-interface  create
     +   └─ azure-native:compute:VirtualMachine        azure-py-loadbalancer-vm                    create

    Resources:
        + 9 to create

    Do you want to perform this update? yes
    Updating (azuredev):

        Type                                           Name                                        Status
     +  pulumi:pulumi:Stack                            azure-py-loadbalancer-vm-azuredev           created (14s)
     +   ├─ random:index:RandomString                  azure-py-loadbalancer-vm-lb-domain-label    created (0.28s)
     +   ├─ azure-native:resources:ResourceGroup       azure-py-loadbalancer-vm-resource-group     created (0.90s)
     +   ├─ azure-native:network:VirtualNetwork        azure-py-loadbalancer-vm-network            created (4s)
     +   ├─ azure-native:network:NetworkSecurityGroup  azure-py-loadbalancer-vm-security-group     created (2s)
     +   ├─ azure-native:network:PublicIPAddress       azure-py-loadbalancer-vm-lb-public-ip       created (5s)
     +   ├─ azure-native:network:LoadBalancer          azure-py-loadbalancer-vm-lb                 created (1s)
     +   ├─ azure-native:network:NetworkInterface      azure-py-loadbalancer-vm-network-interface  created (5s)
     +   └─ azure-native:compute:VirtualMachine        azure-py-loadbalancer-vm                    created (87s)

        Outputs:
            fqdn : "http://azure-py-loadbalancer-vm-n3jtn905.westus2.cloudapp.azure.com"
            lb-ip: "20.3.225.29"

        Resources:
            + 9 created

        Duration: 1m51s

        Permalink: https://app.pulumi.com/phillipedwards/azure-py-loadbalancer-vm/azuredev/updates/3
    ```

1. Get the IP address of the newly-created Load Balancer from the stack's outputs:

    ```bash
    $ pulumi stack output lb-ip
    137.117.15.111
    ```

1. Get the FQDN of the newly-created Load Balancer from the stack's outputs:

    ```bash
    $ pulumi stack output fqdn
    http://azure-py-loadbalancer-vm-n3jtn905.westus2.cloudapp.azure.com
    ```

1. Check to see that your server is now running:

    ```
    $ curl "http://$(pulumi stack output lb-ip)"
    Hello, World!

    $ curl "$(pulumi stack output fqdn)"
    Hello, World!
    ```

1. Destroy the stack:

    ```bash
    $ pulumi destroy --yes
    Previewing destroy (azuredev):

        Type                                          Name                                        Plan
    -   pulumi:pulumi:Stack                           azure-py-loadbalancer-vm-azuredev           delete
    -   ├─ azure-native:compute:VirtualMachine        azure-py-loadbalancer-vm                    delete
    -   ├─ azure-native:network:NetworkInterface      azure-py-loadbalancer-vm-network-interface  delete
    -   ├─ azure-native:network:LoadBalancer          azure-py-loadbalancer-vm-lb                 delete
    -   ├─ azure-native:network:PublicIPAddress       azure-py-loadbalancer-vm-lb-public-ip       delete
    -   ├─ azure-native:network:NetworkSecurityGroup  azure-py-loadbalancer-vm-security-group     delete
    -   ├─ azure-native:network:VirtualNetwork        azure-py-loadbalancer-vm-network            delete
    -   ├─ random:index:RandomString                  azure-py-loadbalancer-vm-lb-domain-label    delete
    -   └─ azure-native:resources:ResourceGroup       azure-py-loadbalancer-vm-resource-group     delete

    Outputs:
     - fqdn : "http://azure-py-loadbalancer-vm-n3jtn905.westus2.cloudapp.azure.com"
     - lb-ip: "20.3.225.29"

    Resources:
        - 9 to delete

    Destroying (azuredev):

    Type                                              Name                                        Status
    -   pulumi:pulumi:Stack                           azure-py-loadbalancer-vm-azuredev           deleted
    -   ├─ azure-native:compute:VirtualMachine        azure-py-loadbalancer-vm                    deleted (42s)
    -   ├─ azure-native:network:NetworkInterface      azure-py-loadbalancer-vm-network-interface  deleted (5s)
    -   ├─ azure-native:network:LoadBalancer          azure-py-loadbalancer-vm-lb                 deleted (10s)
    -   ├─ azure-native:network:PublicIPAddress       azure-py-loadbalancer-vm-lb-public-ip       deleted (20s)
    -   ├─ azure-native:network:VirtualNetwork        azure-py-loadbalancer-vm-network            deleted (11s)
    -   ├─ azure-native:network:NetworkSecurityGroup  azure-py-loadbalancer-vm-security-group     deleted (3s)
    -   ├─ azure-native:resources:ResourceGroup       azure-py-loadbalancer-vm-resource-group     deleted (76s)
    -   └─ random:index:RandomString                  azure-py-loadbalancer-vm-lb-domain-label    deleted (0.23s)


    Outputs:
    - fqdn : "http://azure-py-loadbalancer-vm-n3jtn905.westus2.cloudapp.azure.com"
    - lb-ip: "20.3.225.29"

    Resources:
        - 9 deleted

    Duration: 2m38s
    ```
