[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Virtual Data Center (VDC)

This example deploys an Azure Virtual Data Center (VDC) hub-and-spoke network stack in Azure, complete with ExpressRoute and VPN Gateways, Azure Firewall (with provision for forced tunnelling) guarding a DMZ, and provision for Azure Bastion. Shared services may have their own subnets in the hub, and multiple spokes may be managed with subnets for applications and environments.

This all works using custom routing to redirect all traffic to and from Azure VNets, as well as all traffic to, within and from the DMZ, through the firewall (which scales out as a service). Traffic between ordinary subnets in the hub and spokes is not redirected through the firewall, and should instead be controlled using Network Security Groups (not yet implemented). Firewall rules are required to allow traffic through (not yet implemented).

The intention is for matching stacks to be deployed in Azure [paired regions](https://docs.microsoft.com/en-us/azure/best-practices-availability-paired-regions), configured as either Production/Disaster Recovery or High Availability (or both for different applications). Global VNet Peering between the hubs connects the separate stacks into one symmetric network.

Although the VDC pattern is in widespread use, Azure now offers a managed service intended to replace it, comprising Virtual Hub and SD-WAN components, with a [migration plan](https://docs.microsoft.com/en-us/azure/virtual-wan/migrate-from-hub-spoke-topology) that illustrates the differences between the two patterns. But if you want or need to manage your own network infrastructure, VDC is still relevant.

This example uses `pulumi.ComponentResource` as described [here](https://www.pulumi.com/docs/intro/concepts/programming-model/#components) which demonstrates how multiple low-level resources can be composed into a higher-level, reusable abstraction. It also demonstrates use of `pulumi.StackReference` as described [here](https://www.pulumi.com/docs/intro/concepts/organizing-stacks-projects/#inter-stack-dependencies) to relate multiple stacks.

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

1. Create a new stack intended for Production (for example's sake):

    ```bash
    $ pulumi stack init prod
    ```
    
    This will appear within your Pulumi organization under the `azure-py-vdc` project (as specified in `Pulumi.yaml`).

1. Set the configuration variables for this stack to suit yourself, following guidance in `Pulumi.yaml`. This will create a new `Pulumi.prod.yaml` file (named after the stack) in which to store them:

    Required:
    ```bash
    $ pulumi config set azure:environment           public
    $ pulumi config set azure:location              australiasoutheast
    $ pulumi config set firewall_address_space      192.168.100.0/24
    $ pulumi config set firewall_dmz_subnet         192.168.100.128/25
    $ pulumi config set firewall_subnet             192.168.100.0/26
    $ pulumi config set hub_address_space           10.100.0.0/16
    $ pulumi config set hub_first_subnet            10.100.1.0/24
    $ pulumi config set hub_gateway_subnet          10.100.0.0/26
    $ pulumi config set spoke1_address_space        10.101.0.0/16
    $ pulumi config set spoke1_first_subnet         10.101.1.0/24
    $ pulumi config set spoke2_address_space        10.102.0.0/16
    $ pulumi config set spoke2_first_subnet         10.102.1.0/24
    ```
    Optional:
    ```bash
    $ pulumi config set firewall_management_subnet  192.168.100.64/26
    $ pulumi config set hub_bastion_subnet          10.100.0.64/27
    $ pulumi config set spoke1_bastion_subnet       10.101.0.0/27
    $ pulumi config set spoke2_bastion_subnet       10.102.0.0/27
    ```

1. Deploy the `prod` stack with the `pulumi up` command. This may take up to an hour to provision all the Azure resources specified, including gateways and firewall:

    ```bash
    $ pulumi up
    ```

1. After a while, your Production stack will be ready.

    ```bash
    Updating (prod):
         Type                                             Name               Status
     +   pulumi:pulumi:Stack                              azure-py-vdc-prod  created
     +   ├─ vdc:network:Hub                               hub                created
     +   │  ├─ azure:network:VirtualNetwork               hub-vn-            created
     +   │  ├─ azure:network:PublicIp                     hub-vpn-gw-pip-    created
     +   │  ├─ azure:network:PublicIp                     hub-fw-pip-        created
     +   │  ├─ azure:network:PublicIp                     hub-er-gw-pip-     created
     +   │  ├─ azure:network:Subnet                       hub-dmz-sn         created
     +   │  ├─ azure:network:Subnet                       hub-fw-sn          created
     +   │  ├─ azure:network:Subnet                       hub-gw-sn          created
     +   │  ├─ azure:network:VirtualNetworkGateway        hub-vpn-gw-        created
     +   │  ├─ azure:network:Firewall                     hub-fw-            created
     +   │  ├─ azure:network:VirtualNetworkGateway        hub-er-gw-         created
     +   │  ├─ azure:network:RouteTable                   hub-gw-rt-         created
     +   │  ├─ azure:network:Subnet                       hub-fwm-sn         created
     +   │  ├─ azure:network:RouteTable                   hub-dmz-rt-        created
     +   │  ├─ azure:network:Subnet                       hub-ab-sn          created
     +   │  ├─ azure:network:RouteTable                   hub-ss-rt-         created
     +   │  ├─ azure:network:Route                        ss-dg-r-           created
     +   │  ├─ azure:network:Route                        ss-dmz-r-          created
     +   │  ├─ azure:network:Route                        ss-gw-r-           created
     +   │  ├─ azure:network:Subnet                       hub-domain-sn-     created
     +   │  ├─ azure:network:Subnet                       hub-files-sn-      created
     +   │  ├─ azure:network:Route                        gw-gw-r-           created
     +   │  ├─ azure:network:SubnetRouteTableAssociation  hub-gw-sn-rta      created
     +   │  ├─ azure:network:Route                        gw-dmz-r-          created
     +   │  ├─ azure:network:Route                        gw-hub-r-          created
     +   │  ├─ azure:network:SubnetRouteTableAssociation  hub-dmz-sn-rta     created
     +   │  ├─ azure:network:Route                        dmz-dg-r-          created
     +   │  ├─ azure:network:Route                        dmz-dmz-r-         created
     +   │  ├─ azure:network:Route                        dmz-hub-r-         created
     +   │  ├─ azure:network:SubnetRouteTableAssociation  hub-domain-sn-rta  created
     +   │  └─ azure:network:SubnetRouteTableAssociation  hub-files-sn-rta   created
     +   ├─ vdc:network:Spoke                             s01                created
     +   │  ├─ azure:network:VirtualNetwork               s01-vn-            created
     +   │  ├─ azure:network:VirtualNetworkPeering        hub-s01-vnp-       created
     +   │  ├─ azure:network:VirtualNetworkPeering        s01-hub-vnp-       created
     +   │  ├─ azure:network:Route                        ss-s01-r-          created
     +   │  ├─ azure:network:Route                        gw-s01-r-          created
     +   │  ├─ azure:network:Route                        dmz-s01-r-         created
     +   │  ├─ azure:network:RouteTable                   s01-rt-            created
     +   │  ├─ azure:network:Subnet                       s01-ab-sn          created
     +   │  ├─ azure:network:Route                        s01-dmz-r-         created
     +   │  ├─ azure:network:Subnet                       s01-web-sn-        created
     +   │  ├─ azure:network:Subnet                       s01-db-sn-         created
     +   │  ├─ azure:network:Subnet                       s01-app-sn-        created
     +   │  ├─ azure:network:Route                        s01-hub-r-         created
     +   │  ├─ azure:network:Route                        s01-dg-r-          created
     +   │  ├─ azure:network:SubnetRouteTableAssociation  s01-web-sn-rta     created
     +   │  ├─ azure:network:SubnetRouteTableAssociation  s01-db-sn-rta      created
     +   │  └─ azure:network:SubnetRouteTableAssociation  s01-app-sn-rta     created
     +   ├─ vdc:network:Spoke                             s02                created
     +   │  ├─ azure:network:VirtualNetwork               s02-vn-            created
     +   │  ├─ azure:network:VirtualNetworkPeering        hub-s02-vnp-       created
     +   │  ├─ azure:network:VirtualNetworkPeering        s02-hub-vnp-       created
     +   │  ├─ azure:network:Route                        ss-s02-r-          created
     +   │  ├─ azure:network:Route                        gw-s02-r-          created
     +   │  ├─ azure:network:Route                        dmz-s02-r-         created
     +   │  ├─ azure:network:RouteTable                   s02-rt-            created
     +   │  ├─ azure:network:Subnet                       s02-ab-sn          created
     +   │  ├─ azure:network:Route                        s02-dg-r-          created
     +   │  ├─ azure:network:Route                        s02-dmz-r-         created
     +   │  ├─ azure:network:Subnet                       s02-db-sn-         created
     +   │  ├─ azure:network:Subnet                       s02-web-sn-        created
     +   │  ├─ azure:network:Subnet                       s02-app-sn-        created
     +   │  ├─ azure:network:Route                        s02-hub-r-         created
     +   │  ├─ azure:network:SubnetRouteTableAssociation  s02-db-sn-rta      created
     +   │  ├─ azure:network:SubnetRouteTableAssociation  s02-web-sn-rta     created
     +   │  └─ azure:network:SubnetRouteTableAssociation  s02-app-sn-rta     created
     +   └─ azure:core:ResourceGroup                      prod-vdc-rg-       created

    Outputs:
        dmz_ar     : "192.168.100.128/25"
        fw_ip      : "192.168.100.4"
        hub_as     : "10.100.0.0/16"
        hub_id     : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-93bf9625/providers/Microsoft.Network/virtualNetworks/hub-vn-edad2043"
        hub_name   : "hub-vn-edad2043"
        s01_id     : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-93bf9625/providers/Microsoft.Network/virtualNetworks/s01-vn-a2bf69fc"
        s01_name   : "s01-vn-a2bf69fc"
        s02_id     : "/subscriptions/subscription/resourceGroups/prod-vdc-rg-93bf9625/providers/Microsoft.Network/virtualNetworks/s02-vn-3400a248"
        s02_name   : "s02-vn-3400a248"

    Resources:
        + 69 created

    Duration: 48m5s

    Permalink: https://app.pulumi.com/organization/azure-py-vdc/prod/updates/1
    ```
    
    Feel free to modify your program, and then run `pulumi up` again. Pulumi automatically detects differences and makes the minimal changes necessary to achieved the desired state. If any changes to resources are made outside of Pulumi, you should first do a `pulumi refresh` so that Pulumi can discover the actual situation, and then `pulumi up` to return to desired state.
   
    Note that because most resources are [auto-named](https://www.pulumi.com/docs/intro/concepts/programming-model/#autonaming), you see trailing dashes above which will actually be followed by random suffixes that you can see in the Outputs and in Azure.

1. Create another new stack intended for Disaster Recovery (following the example):

    ```bash
    $ pulumi stack init dr
    ```
    
    This will also appear within your Pulumi organization under the `azure-py-vdc` project (as specified in `Pulumi.yaml`).

1. Set the configuration variables for this stack which will be stored in a new `Pulumi.dr.yaml` file (change the values below to suit yourself):

    Required:
    ```bash
    $ pulumi config set azure:environment           public
    $ pulumi config set azure:location              australiaeast
    $ pulumi config set firewall_address_space      192.168.200.0/24
    $ pulumi config set firewall_dmz_subnet         192.168.200.128/25
    $ pulumi config set firewall_subnet             192.168.200.0/26
    $ pulumi config set hub_address_space           10.200.0.0/16
    $ pulumi config set hub_first_subnet            10.200.1.0/24
    $ pulumi config set hub_gateway_subnet          10.200.0.0/26
    $ pulumi config set spoke1_address_space        10.201.0.0/16
    $ pulumi config set spoke1_first_subnet         10.201.1.0/24
    $ pulumi config set spoke2_address_space        10.202.0.0/16
    $ pulumi config set spoke2_first_subnet         10.202.1.0/24
    ```
    Optional:
    ```bash
    $ pulumi config set firewall_management_subnet  192.168.200.64/26
    $ pulumi config set hub_bastion_subnet          10.200.0.64/27
    $ pulumi config set spoke1_bastion_subnet       10.201.0.0/27
    $ pulumi config set spoke2_bastion_subnet       10.202.0.0/27
    ```

1. Deploy the `dr` stack with the `pulumi up` command. Once again, this may take up to an hour to provision all the Azure resources specified, including gateways and firewall:

    ```bash
    $ pulumi up
    ```

1. Once you have both Production and Disaster Recovery stacks (ideally in paired regions), you can connect their hubs using Global (if in different regions) VNet Peering:

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