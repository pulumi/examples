[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-loadbalancer-vm/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-loadbalancer-vm/README.md#gh-dark-mode-only)

# Load balancer and web server using Azure Load Balancer and Virtual Machine

This example deploys an Azure Load Balancer fronting an Azure Virtual Machine and starts an HTTP server on the VM.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the required configuration for this example. This example requires you to supply a username and password to the virtual machine that we are going to create. Note that `--secret` ensures your password is encrypted safely.

    ```bash
    pulumi config set azure-native:location westus    # any valid Azure region will do
    pulumi config set username webmaster
    pulumi config set password --secret <your-password>
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
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
    ```

1. Get the IP address of the newly-created Load Balancer from the stack's outputs:

    ```bash
    pulumi stack output lb-ip
    ```

1. Get the FQDN of the newly-created Load Balancer from the stack's outputs:

    ```bash
    pulumi stack output fqdn
    ```

1. Check to see that your server is now running:

    ```bash
    curl "http://$(pulumi stack output lb-ip)"
    curl "$(pulumi stack output fqdn)"
    ```

    ```
    Hello, World!
    ```

## Cleaning up

Once you are finished, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
