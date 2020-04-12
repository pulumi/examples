[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Virtual Data Center (VDC)

This example deploys an Azure Virtual Data Center (VDC) hub-and-spoke network stack in Azure, complete with ExpressRoute and VPN Gateways, Azure Firewall (with provision for forced tunnelling) and a DMZ in the hub. Shared services may have their own subnets in the hub, and multiple spokes may be provisioned with subnets for applications and environments.

In this implementation, custom routing is used to redirect all traffic to and from Azure VNets, as well as all traffic to, within and from the DMZ, through the firewall (which scales out as a service). Traffic between ordinary hub and spoke subnets is not redirected through the firewall, and should be controlled using Network Security Groups (not yet implemented). Firewall rules are required to allow traffic through (not yet implemented).

The intention is that matching stacks would be deployed in Azure [paired regions](https://docs.microsoft.com/en-us/azure/best-practices-availability-paired-regions), either in Production/Disaster Recovery or High Availability configurations. Global VNet Peering between the hubs connects the separate stacks into one network.

Although the VDC pattern is in widespread use, Azure nows offers a managed service intended to replace it, comprising Virtual Hub and SD-WAN components. The [migration plan](https://docs.microsoft.com/en-us/azure/virtual-wan/migrate-from-hub-spoke-topology) shows the differences. But if you want or need to manage your own network infrastructure, VDC is still relevant.

This example uses `pulumi.ComponentResource` as described [here](https://www.pulumi.com/docs/intro/concepts/programming-model/#components) which demonstrates how multiple low-level resources can be composed into a higher-level, reusable abstraction. It also demonstrates use of `pulumi.StackReference` as described [here](https://www.pulumi.com/docs/intro/concepts/organizing-stacks-projects/#inter-stack-dependencies) to manage multiple related stacks.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for Azure](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)

# Running the Example

After cloning this repo, `cd` into the `azure-py-virtual-data-center` directory and run the following commands.
   
1. (recommended) Create a Python virtualenv, activate it, and install the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program:

    ```
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1. Create a new stack intended for Production, for example:

    ```bash
    $ pulumi stack init prod
    ```
    
    This will appear within your Pulumi organization under the `azure-py-vdc` project (as specified in `Pulumi.yaml`).

1. Set the configuration variables for this stack which will be stored in a new `Pulumi.prod.yaml` file (change the values below to suit yourself):

    Required:
    ```bash
    $ pulumi config set azure:environment   public
    $ pulumi config set azure:location      australiasoutheast
    $ pulumi config set dmz_ar              192.168.100.128/25
    $ pulumi config set fws_ar              192.168.100.0/26
    $ pulumi config set fwz_as              192.168.100.0/24
    $ pulumi config set gws_ar              10.100.0.0/26
    $ pulumi config set hub_as              10.100.0.0/16
    $ pulumi config set hub_stem            hub
    $ pulumi config set spoke_as            10.101.0.0/16
    $ pulumi config set spoke_stem          spoke
    ```
    Optional:
    ```bash
    $ pulumi config set fwm_ar              192.168.100.64/26
    $ pulumi config set hbs_ar              10.100.0.64/27
    $ pulumi config set hub_ar              10.100.1.0/24
    $ pulumi config set sbs_ar              10.101.0.0/27
    $ pulumi config set spoke_ar            10.101.1.0/24
    ```

1. Deploy the `prod` stack with the `pulumi up` command. This provisions all the Azure resources necessary, including gateways and firewall which may take up to an hour:

    ```bash
    $ pulumi up
    ```

1. After a while, your Production stack will be ready. If some outputs don't initially show then it may be necessary to do a `pulumi refresh` and then `pulumi up` again.

    ```bash
    Updating (prod):
         Type                                             Name                  Status
     +   pulumi:pulumi:Stack                              azure-py-vdc-prod     created
     +   ├─ vdc:network:Hub                               hub                   created
     +   │  ├─ azure:network:PublicIp                     hub-er-gw-pip-        created
     +   │  ├─ azure:network:PublicIp                     hub-vpn-gw-pip-       created
     +   │  ├─ azure:network:PublicIp                     hub-fw-pip-           created
     +   │  ├─ azure:network:Subnet                       hub-dmz-sn            created
     +   │  ├─ azure:network:Subnet                       hub-fw-sn             created
     +   │  ├─ azure:network:Subnet                       hub-fwm-sn            created
     +   │  ├─ azure:network:Subnet                       hub-gw-sn             created
     +   │  ├─ azure:network:Subnet                       hub-ab-sn             created
     +   │  ├─ azure:network:VirtualNetworkGateway        hub-vpn-gw-           created
     +   │  ├─ azure:network:Firewall                     hub-fw-               created
     +   │  ├─ azure:network:VirtualNetworkGateway        hub-er-gw-            created
     +   │  ├─ azure:network:RouteTable                   hub-dmz-rt-           created
     +   │  ├─ azure:network:RouteTable                   hub-sn-rt-            created
     +   │  ├─ azure:network:RouteTable                   hub-gw-rt-            created
     +   │  ├─ azure:network:SubnetRouteTableAssociation  hub-dmz-sn-rta        created
     +   │  ├─ azure:network:Route                        hub-dmz-dmz-r-        created
     +   │  ├─ azure:network:Route                        hub-dmz-sn-r-         created
     +   │  ├─ azure:network:Route                        hub-dmz-dg-r-         created
     +   │  ├─ azure:network:Route                        hub-sn-dmz-r-         created
     +   │  ├─ azure:network:Route                        hub-sn-dg-r-          created
     +   │  ├─ azure:network:Subnet                       hub-example-sn-       created
     +   │  ├─ azure:network:Route                        hub-gw-gw-r-          created
     +   │  ├─ azure:network:SubnetRouteTableAssociation  hub-gw-sn-rta         created
     +   │  ├─ azure:network:Route                        hub-gw-dmz-r-         created
     +   │  ├─ azure:network:Route                        hub-gw-sn-r-          created
     +   │  └─ azure:network:SubnetRouteTableAssociation  hub-example-sn-rta    created
     +   ├─ azure:core:ResourceGroup                      prod-vdc-rg-          created
     +   └─ vdc:network:Spoke                             spoke                 created
     +      ├─ azure:network:VirtualNetwork               spoke-vn-             created
     +      ├─ azure:network:Route                        hub-dmz-spoke-r-      created
     +      ├─ azure:network:Route                        hub-sn-spoke-r-       created
     +      ├─ azure:network:Route                        hub-gw-spoke-r-       created
     +      ├─ azure:network:Subnet                       spoke-ab-sn           created
     +      ├─ azure:network:Subnet                       spoke-example-sn-     created
     +      ├─ azure:network:VirtualNetworkPeering        spoke-hub-vnp-        created
     +      ├─ azure:network:VirtualNetworkPeering        hub-spoke-vnp-        created
     +      ├─ azure:network:RouteTable                   spoke-sn-rt-          created
     +      ├─ azure:network:SubnetRouteTableAssociation  spoke-example-sn-rta  created
     +      ├─ azure:network:Route                        spoke-hub-dmz-r-      created
     +      ├─ azure:network:Route                        spoke-hub-dg-r-       created
     +      └─ azure:network:Route                        spoke-hub-sn-r-       created

    Outputs:
        hub_id       : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-615948f0/providers/Microsoft.Network/virtualNetworks/hub-vn-a98ceb25"
        hub_name     : "hub-vn-a98ceb25"
        hub_subnets  : [
          + [0]: {
                  + address_prefix: "10.100.1.0/24"
                  + id            : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-615948f0/providers/Microsoft.Network/virtualNetworks/hub-vn-a98ceb25/subnets/hub-example-sn-d8cb4a9b"
                  + name          : "hub-example-sn-d8cb4a9b"
                }
          + [1]: {
                  + address_prefix: "192.168.100.64/26"
                  + id            : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-615948f0/providers/Microsoft.Network/virtualNetworks/hub-vn-a98ceb25/subnets/AzureFirewallManagementSubnet"
                  + name          : "AzureFirewallManagementSubnet"
                }
          + [2]: {
                  + address_prefix: "192.168.100.128/25"
                  + id            : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-615948f0/providers/Microsoft.Network/virtualNetworks/hub-vn-a98ceb25/subnets/DMZ"
                  + name          : "DMZ"
                }
          + [3]: {
                  + address_prefix: "10.100.0.0/26"
                  + id            : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-615948f0/providers/Microsoft.Network/virtualNetworks/hub-vn-a98ceb25/subnets/GatewaySubnet"
                  + name          : "GatewaySubnet"
                }
          + [4]: {
                  + address_prefix: "192.168.100.0/26"
                  + id            : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-615948f0/providers/Microsoft.Network/virtualNetworks/hub-vn-a98ceb25/subnets/AzureFirewallSubnet"
                  + name          : "AzureFirewallSubnet"
                }
          + [5]: {
                  + address_prefix: "10.100.0.64/27"
                  + id            : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-615948f0/providers/Microsoft.Network/virtualNetworks/hub-vn-a98ceb25/subnets/AzureBastionSubnet"
                  + name          : "AzureBastionSubnet"
                }
        ]
        spoke_id     : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-615948f0/providers/Microsoft.Network/virtualNetworks/spoke-vn-98ab581a"
        spoke_name   : "spoke-vn-98ab581a"
        spoke_subnets: [
          + [0]: {
                  + address_prefix: "10.101.0.0/27"
                  + id            : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-615948f0/providers/Microsoft.Network/virtualNetworks/spoke-vn-98ab581a/subnets/AzureBastionSubnet"
                  + name          : "AzureBastionSubnet"
                }
          + [1]: {
                  + address_prefix: "10.101.1.0/24"
                  + id            : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-615948f0/providers/Microsoft.Network/virtualNetworks/spoke-vn-98ab581a/subnets/spoke-example-sn-a1594836"
                  + name          : "spoke-example-sn-a1594836"
                }
        ]

    Resources:
        + 44 created

    Duration: 24m24s

    Permalink: https://app.pulumi.com/organization/azure-py-vdc/prod/updates/1    ...
    ```
   
   Feel free to modify your program, and then run `pulumi up` again. The Pulumi CLI automatically detects differences and makes the minimal changes necessary to achieved the desired state.
   
   Note that because most resources are [auto-named](https://www.pulumi.com/docs/intro/concepts/programming-model/#autonaming), a trailing dash on the logical name is used to separate the random suffix that will be applied, while manually-named resources are set to be deleted before replacement.

1. Create another new stack intended for Disaster Recovery, for example:

    ```bash
    $ pulumi stack init dr
    ```
    
    This will also appear within your Pulumi organization under the `azure-py-vdc` project (as specified in `Pulumi.yaml`).

1. Set the configuration variables for this stack which will be stored in a new `Pulumi.dr.yaml` file (change the values below to suit yourself):

    Required:
    ```bash
    $ pulumi config set azure:environment   public
    $ pulumi config set azure:location      australiaeast
    $ pulumi config set dmz_ar              192.168.200.128/25
    $ pulumi config set fws_ar              192.168.200.0/26
    $ pulumi config set fwz_as              192.168.200.0/24
    $ pulumi config set gws_ar              10.200.0.0/26
    $ pulumi config set hub_as              10.200.0.0/16
    $ pulumi config set hub_stem            hub
    $ pulumi config set spoke_as            10.201.0.0/16
    $ pulumi config set spoke_stem          spoke
    ```
    Optional:
    ```bash
    $ pulumi config set fwm_ar              192.168.200.64/26
    $ pulumi config set hbs_ar              10.200.0.64/27
    $ pulumi config set hub_ar              10.200.1.0/24
    $ pulumi config set sbs_ar              10.201.0.0/27
    $ pulumi config set spoke_ar            10.201.1.0/24
    ```

1. Deploy the `dr` stack with the `pulumi up` command. This provisions all the Azure resources necessary in the paired region, including gateways and firewall which may take up to an hour:

    ```bash
    $ pulumi up
    ```

1. Once you have Production and Disaster Recovery stacks in paired regions, you can connect their hubs using Global VNet Peering:

    ```bash
    $ pulumi stack select prod
    $ pulumi config set org <your Pulumi organization>
    $ pulumi config set peer dr
    $ pulumi up
    $ pulumi stack select dr
    $ pulumi config set org <your Pulumi organization>
    $ pulumi config set peer prod
    $ pulumi up
    ```
    Note: it isn't yet [possible](https://github.com/pulumi/pulumi/issues/2800) to discover the Pulumi organization from within the program, which is why you need to set the `org` configuration variable for each stack that needs to peer with another stack.

    If you later destroy a stack, you need to remove the corresponding `peer` variable in the other stack and run `pulumi up`. If you want to tear down the peerings, you should remove the `peer` variables in both stacks and run `pulumi up`:

    ```bash
    $ pulumi stack select prod
    $ pulumi config rm peer
    $ pulumi up
    $ pulumi stack select dr
    $ pulumi config rm peer
    $ pulumi up
    ```

    You need to remove both peerings before you can connect the hubs again.

1. When you are finished experimenting, you can destroy all of the resources, and the stacks:

    ```bash
    $ pulumi stack select prod
    $ pulumi destroy
    $ pulumi stack rm
    $ pulumi stack select dr
    $ pulumi destroy
    $ pulumi stack rm
    ```