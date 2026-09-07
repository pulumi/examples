[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-webserver/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-webserver/README.md#gh-dark-mode-only)

# Web server using Azure Virtual Machine

This example deploys an Azure Virtual Machine and starts an HTTP server on it.

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
    ```

1. Get the IP address of the newly-created instance from the stack's outputs:

    ```bash
    pulumi stack output public_ip
    ```

1. Check to see that your server is now running:

    ```bash
    curl http://$(pulumi stack output public_ip)
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
