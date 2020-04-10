[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Virtual Data Center (VDC)

This example deploys an Azure Virtual Datacenter (VDC) hub-and-spoke network stack in Azure, complete with ExpressRoute and VPN Gateways, Azure Firewall (with provision for forced tunnelling) and a shared DMZ in the hub. In this implementation, custom routing is used to redirect all traffic to and from Azure and between VNets in Azure through the firewall, as well as all traffic to and from the DMZ. Shared services may have their own subnets in the hub, and multiple spokes may be provisioned with subnets for applications and environments.

The intention is that matching stacks would be defined in paired Azure regions, either in Prod/Disaster Recovery or High Availability configurations. It is possible to define Global VNet Peering between hubs in different stacks.

Although this pattern is in widespread use it has been superseded by the new Virtual Hub and SD-WAN architecture, with the migration plan detailed at:
https://docs.microsoft.com/en-us/azure/virtual-wan/migrate-from-hub-spoke-topology

This example uses `pulumi.ComponentResource` as described [here](https://www.pulumi.com/docs/intro/concepts/programming-model/#components). The use of `pulumi.ComponentResource` demonstrates how multiple low-level resources can be composed into a higher-level, reusable abstraction.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for Azure](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)

# Running the Example

After cloning this repo, `cd` into it and run these commands.

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init prod
    ```
   
1.  Create a Python virtualenv, activate it, and install dependencies:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set azure:environment   public
    $ pulumi config set azure:location      australiasoutheast
    $ pulumi config set dmz_ar              192.168.100.128/25
    $ pulumi config set fwm_ar              192.168.100.64/26
    $ pulumi config set fws_ar              192.168.100.0/26
    $ pulumi config set fwz_as              192.168.100.0/24
    $ pulumi config set gws_ar              10.100.0.0/26
    $ pulumi config set hbs_ar              10.100.0.64/27
    $ pulumi config set hub_ar              10.100.1.0/24
    $ pulumi config set hub_as              10.100.0.0/16
    $ pulumi config set hub_stem            hub
    $ pulumi config set sbs_ar              10.101.0.0/27
    $ pulumi config set spoke_ar            10.101.1.0/24
    $ pulumi config set spoke_as            10.101.0.0/16
    $ pulumi config set spoke_stem          spoke
    ```

1. Deploy everything with the `pulumi up` command. This provisions all the Azure resources necessary, including gateways and firewall which will take up to an hour:

    ```bash
    $ pulumi up
    ```

1. After a while, your VDC will be ready. The VNet address spaces will be printed as output
   variables once `pulumi up` completes.

    ```bash
Updating (prod):
     Type                                             Name               Status
 +   pulumi:pulumi:Stack                              azure-py-vdc-prod      created
 +   ├─ vdc:network:Hub                               hub                    created
 +   │  ├─ azure:network:VirtualNetwork               hub-vn-                created
 +   │  ├─ azure:network:PublicIp                     hub-er-gw-pip-         created
 +   │  ├─ azure:network:PublicIp                     hub-vpn-gw-pip-        created
 +   │  ├─ azure:network:PublicIp                     hub-fw-pip-            created
 +   │  ├─ azure:network:Subnet                       hub-dmz-sn             created
 +   │  ├─ azure:network:Subnet                       hub-fw-sn              created
 +   │  ├─ azure:network:Subnet                       hub-fwm-sn             created
 +   │  ├─ azure:network:Subnet                       hub-gw-sn              created
 +   │  ├─ azure:network:Subnet                       hub-ab-sn              created
 +   │  ├─ azure:network:VirtualNetworkGateway        hub-vpn-gw-            created
 +   │  ├─ azure:network:VirtualNetworkGateway        hub-er-gw-             created
 +   │  ├─ azure:network:Firewall                     hub-fw-                created
 +   │  ├─ azure:network:RouteTable                   hub-sn-rt-             created
 +   │  ├─ azure:network:RouteTable                   hub-gw-rt-             created
 +   │  ├─ azure:network:RouteTable                   hub-dmz-rt-            created
 +   │  ├─ azure:network:SubnetRouteTableAssociation  hub-gw-sn-rta          created
 +   │  ├─ azure:network:Route                        hub-gw-dmz-r-          created
 +   │  ├─ azure:network:Route                        hub-gw-sn-r-           created
 +   │  ├─ azure:network:SubnetRouteTableAssociation  hub-dmz-sn-rta         created
 +   │  ├─ azure:network:Route                        hub-dmz-dmz-r-         created
 +   │  ├─ azure:network:Route                        hub-dmz-sn-r-          created
 +   │  ├─ azure:network:Route                        hub-dmz-dg-r-          created
 +   │  ├─ azure:network:Route                        hub-sn-dmz-r-          created
 +   │  ├─ azure:network:Route                        hub-sn-dg-r-           created
 +   │  ├─ azure:network:Subnet                       hub-example-sn-        created
 +   │  └─ azure:network:SubnetRouteTableAssociation  hub-example-sn-rta     created
 +   ├─ azure:core:ResourceGroup                      vdc-rg-                created
 +   └─ vdc:network:Spoke                             spoke                  created
 +      ├─ azure:network:VirtualNetwork               spoke-vn-              created
 +      ├─ azure:network:Route                        hub-gw-spoke-r-        created
 +      ├─ azure:network:Route                        hub-dmz-spoke-r-       created
 +      ├─ azure:network:Route                        hub-sn-spoke-r-        created
 +      ├─ azure:network:Subnet                       spoke-ab-sn            created
 +      ├─ azure:network:Subnet                       spoke-example-sn-      created
 +      ├─ azure:network:VirtualNetworkPeering        spoke-hub-vnp-         created
 +      ├─ azure:network:VirtualNetworkPeering        hub-spoke-vnp-         created
 +      ├─ azure:network:RouteTable                   spoke-sn-rt-           created
 +      ├─ azure:network:SubnetRouteTableAssociation  spoke-example-sn-rta   created
 +      ├─ azure:network:Route                        spoke-hub-sn-r-        created
 +      ├─ azure:network:Route                        spoke-hub-dg-r-        created
 +      └─ azure:network:Route                        spoke-hub-dmz-r-       created

Outputs:
        hub_id       : "/subscriptions/<subcription>/resourceGroups/vdc-rg-8aa8b0e3/providers/Microsoft.Network/virtualNetworks/hub-vn-d0ef38e0"
        hub_name     : "hub-vn-d0ef38e0"
        spoke_id     : "/subscriptions/<subcription>/resourceGroups/vdc-rg-8aa8b0e3/providers/Microsoft.Network/virtualNetworks/spoke-vn-7accdec4"
        spoke_name   : "spoke-vn-7accdec4"

Resources:
    + 43 created

Duration: 29m50s

Permalink: https://app.pulumi.com/<organisation>/azure-py-vdc/prod/updates/1
    ...
    ```

1. Once you have stacks in paired regions, you can connect the hubs by cross-referencing the stacks. 

    ```bash
    $ pulumi config set
    $ pulumi config set
    $ pulumi config set
    $ pulumi config set
    $ pulumi config set
    ```

   Feel free to modify your program, and run `pulumi up` to redeploy changes. The Pulumi CLI automatically detects what has changed and makes the minimal edits necessary to accomplish these changes.
   
   Auto-named resources have a trailing dash on the logical name to separate the random suffix,
   however some resources are manually named and must therefore be deleted before replacement:
   https://www.pulumi.com/docs/intro/concepts/programming-model/#autonaming

1. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```