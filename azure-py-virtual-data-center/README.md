[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-virtual-data-center/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-virtual-data-center/README.md#gh-dark-mode-only)

# Azure Virtual Data Center (VDC)

This example deploys Azure Virtual Data Center (VDC) hub-and-spoke network stacks in Azure, complete with ExpressRoute and VPN Gateways, Azure Firewall (with provision for forced tunnelling) guarding a DMZ, and Azure Bastion. In addition, as many subnets as required for shared services in the hub and application environments in the spokes may be simply specified.

In this implementation, the Azure Firewall is central. Custom routing redirects all traffic to and from hub and spokes, as well as all traffic to, within and from the DMZ, through the firewall (which scales out as a service to handle the throughput). Firewall rules are required to allow traffic through (not yet implemented). Traffic between shared services subnets in the hub and between subnets within the spokes is not redirected through the firewall, and should instead be controlled using Network Security Groups (not yet implemented).

With minimal configuration, matching stacks may be deployed in Azure [paired regions](https://docs.microsoft.com/en-us/azure/best-practices-availability-paired-regions), configured for Production/Disaster Recovery or High Availability (or both for different applications). Global VNet Peering between the hubs connects the separate stacks into one symmetric network.

Although the VDC pattern is in widespread use, Azure now offers a managed service intended to replace it, comprising Virtual Hub along with partner SD-WAN components, with a [migration plan](https://docs.microsoft.com/en-us/azure/virtual-wan/migrate-from-hub-spoke-topology) that illustrates the differences between the two patterns. But if you want or need to manage your own network infrastructure, VDC is still relevant.

This example uses `pulumi.ComponentResource` as described [here](https://www.pulumi.com/docs/intro/concepts/resources/#components) which demonstrates how multiple low-level resources can be composed into a higher-level, reusable abstraction. It also demonstrates use of `pulumi.StackReference` as described [here](https://www.pulumi.com/docs/guides/organizing-projects-stacks/) to relate multiple stacks. Finally, it uses Python's ```ipaddress``` module to simplify and validate configuration of network addresses.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for Azure](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)

# Running the Example

After cloning this repo, `cd` into the `azure-py-virtual-data-center` directory and run the following commands.

1. Create a new stack intended for Production (for example's sake):

    ```bash
    $ pulumi stack init prod
    ```

    This will appear within your Pulumi organization under the `azure-py-vdc` project (as specified in `Pulumi.yaml`).

1. Create a Python virtualenv, activate it, and install dependencies:

   This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```bash
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1. Set the configuration variables for this stack to suit yourself, following guidance in `Pulumi.yaml`. This will create a new `Pulumi.prod.yaml` file (named after the stack) in which to store them:

    Required:
    ```bash
    $ pulumi config set firewall_address_space   192.168.100.0/24
    $ pulumi config set hub_address_space        10.100.0.0/16
    $ pulumi config set azure-native:location    australiaeast
    ```
    Optional:
    ```bash
    $ pulumi config set azure_bastion            true
    $ pulumi config set forced_tunnel            10.0.100.1
    $ pulumi config set separator                ' '
    $ pulumi config set suffix                   ae
    ```

    Note that it is advisable to enable Azure Bastion on a second pass to avoid contention.

1. Deploy the `prod` stack with the `pulumi up` command. This may take up to an hour to provision all the Azure resources specified, including gateways, firewall and bastion hosts:

    ```bash
    $ pulumi up
    ```

1. After a while, your Production stack will be ready.

    ```
    Updating (prod)

    View Live: https://app.pulumi.com/organization/azureng-py-vdc/prod/updates/1

         Type                                                      Name                 Status
     +   pulumi:pulumi:Stack                                       azureng-py-vdc-prod  created
     +   ├─ vdc:network:Hub                                        hub                  created
     +   │  ├─ azure-native:network:VirtualNetwork                 hub_vn_ae            created
     +   │  ├─ azure-native:network:RouteTable                     hub_fwm_rt_ae        created
     +   │  ├─ azure-native:network:RouteTable                     hub_fw_rt_ae         created
     +   │  ├─ azure-native:network:Route                          fwm_internet_r       created
     +   │  ├─ azure-native:network:Route                          fw_tunnel_r          created
     +   │  ├─ azure-native:network:Subnet                         hub_fwm_sn           created
     +   │  ├─ azure-native:network:Subnet                         hub_fw_sn            created
     +   │  ├─ azure-native:network:PublicIPAddress                hub_fw_pip_ae        created
     +   │  ├─ azure-native:network:PublicIPAddress                hub_fwm_pip_ae       created
     +   │  ├─ azure-native:network:AzureFirewall                  hub_fw_ae            created
     +   │  ├─ azure-native:network:RouteTable                     hub_dmz_rt_ae        created
     +   │  ├─ azure-native:network:Route                          dmz_dg_r             created
     +   │  ├─ azure-native:network:Route                          dmz_dmz_r            created
     +   │  ├─ azure-native:network:Route                          dmz_hub_r            created
     +   │  ├─ azure-native:network:Subnet                         hub_dmz_sn           created
     +   │  ├─ azure-native:network:RouteTable                     hub_gw_rt_ae         created
     +   │  ├─ azure-native:network:Route                          gw_gw_r              created
     +   │  ├─ azure-native:network:Route                          gw_dmz_r             created
     +   │  ├─ azure-native:network:Route                          gw_hub_r             created
     +   │  ├─ azure-native:network:Subnet                         hub_gw_sn            created
     +   │  ├─ azure-native:network:PublicIPAddress                hub_vpn_gw_pip_ae    created
     +   │  ├─ azure-native:network:PublicIPAddress                hub_er_gw_pip_ae     created
     +   │  ├─ azure-native:network:VirtualNetworkGateway          hub_vpn_gw_ae        created
     +   │  ├─ azure-native:network:VirtualNetworkGateway          hub_er_gw_ae         created
     +   │  ├─ azure-native:network:RouteTable                     hub_ss_rt_ae         created
     +   │  ├─ azure-native:network:PublicIPAddress                hub_ab_pip_ae        created
     +   │  ├─ azure-native:network:Subnet                         hub_ab_sn            created
     +   │  ├─ azure-native:network:Route                          ss_dg_r              created
     +   │  ├─ azure-native:network:Route                          ss_dmz_r             created
     +   │  ├─ azure-native:network:Route                          ss_gw_r              created
     +   │  ├─ azure-native:network:Subnet                         hub_domain_sn        created
     +   │  ├─ azure-native:network:Subnet                         hub_files_sn         created
     +   │  └─ azure-native:network:BastionHost                    hub_ab_ae            created
     +   ├─ vdc:network:Spoke                                      s01                  created
     +   │  ├─ azure-native:network:VirtualNetwork                 s01_vn_ae            created
     +   │  ├─ azure-native:network:RouteTable                     s01_rt_ae            created
     +   │  ├─ azure-native:network:VirtualNetworkPeering          hub_s01_vnp_ae       created
     +   │  ├─ azure-native:network:Route                          s01_dg_r             created
     +   │  ├─ azure-native:network:Route                          s01_hub_r            created
     +   │  ├─ azure-native:network:Route                          s01_dmz_r            created
     +   │  ├─ azure-native:network:Route                          dmz_s01_r            created
     +   │  ├─ azure-native:network:Route                          gw_s01_r             created
     +   │  ├─ azure-native:network:VirtualNetworkPeering          s01_hub_vnp_ae       created
     +   │  ├─ azure-native:network:Route                          ss_s01_r             created
     +   │  ├─ azure-native:network:PublicIPAddress                s01_ab_pip_ae        created
     +   │  ├─ azure-native:network:Subnet                         s01_ab_sn            created
     +   │  ├─ azure-native:network:Subnet                         s01_web_sn           created
     +   │  ├─ azure-native:network:Subnet                         s01_db_sn            created
     +   │  ├─ azure-native:network:Subnet                         s01_app_sn           created
     +   │  └─ azure-native:network:BastionHost                    s01_ab_ae            created
     +   ├─ vdc:network:Spoke                                      s02                  created
     +   │  ├─ azure-native:network:VirtualNetwork                 s02_vn_ae            created
     +   │  ├─ azure-native:network:RouteTable                     s02_rt_ae            created
     +   │  ├─ azure-native:network:VirtualNetworkPeering          hub_s02_vnp_ae       created
     +   │  ├─ azure-native:network:Route                          s02_dg_r             created
     +   │  ├─ azure-native:network:Route                          s02_dmz_r            created
     +   │  ├─ azure-native:network:Route                          s02_hub_r            created
     +   │  ├─ azure-native:network:Route                          dmz_s02_r            created
     +   │  ├─ azure-native:network:Route                          gw_s02_r             created
     +   │  ├─ azure-native:network:VirtualNetworkPeering          s02_hub_vnp_ae       created
     +   │  ├─ azure-native:network:Route                          ss_s02_r             created
     +   │  ├─ azure-native:network:PublicIPAddress                s02_ab_pip_ae        created
     +   │  ├─ azure-native:network:Subnet                         s02_ab_sn            created
     +   │  ├─ azure-native:network:Subnet                         s02_app_sn           created
     +   │  ├─ azure-native:network:Subnet                         s02_web_sn           created
     +   │  ├─ azure-native:network:Subnet                         s02_db_sn            created
     +   │  └─ azure-native:network:BastionHost                    s02_ab_ae            created
     +   └─ azure-native:resources:ResourceGroup                   prod_vdc_rg_ae       created

    Outputs:
        dmz_ar: "192.168.100.128/25"
        fw_ip : "192.168.100.4"
        hub_as: "10.100.0.0/16"
        hub_id: "/subscriptions/subscription/resourceGroups/prod_vdc_rg_ae/providers/Microsoft.Network/virtualNetworks/hub_vn_ae"
        s01_as: "10.101.0.0/16"
        s01_id: "/subscriptions/subscription/resourceGroups/prod_vdc_rg_ae/providers/Microsoft.Network/virtualNetworks/s01_vn_ae"
        s02_as: "10.102.0.0/16"
        s02_id: "/subscriptions/subscription/resourceGroups/prod_vdc_rg_ae/providers/Microsoft.Network/virtualNetworks/s02_vn_ae"

    Resources:
        + 70 created

    Duration: 45m1s
    ```

    Feel free to modify your program, and then run `pulumi up` again. Pulumi automatically detects differences and makes the minimal changes necessary to achieved the desired state. If any changes to resources are made outside of Pulumi, you should first do a `pulumi refresh` so that Pulumi can discover the actual situation, and then `pulumi up` to return to desired state.

1. Create another new stack intended for Disaster Recovery (following the example):

    ```bash
    $ pulumi stack init dr
    ```

    This will also appear within your Pulumi organization under the `azureng-py-vdc` project (as specified in `Pulumi.yaml`).

1. Set the configuration variables for this stack which will be stored in a new `Pulumi.dr.yaml` file (change the values below to suit yourself):

    Required:
    ```bash
    $ pulumi config set firewall_address_space   192.168.200.0/24
    $ pulumi config set hub_address_space        10.200.0.0/16
    $ pulumi config set location                 australiasoutheast
    ```
    Optional:
    ```bash
    $ pulumi config set azure_bastion            true
    $ pulumi config set forced_tunnel            10.0.200.1
    $ pulumi config set separator                _
    $ pulumi config set suffix                   ase
    ```

    Note that it is advisable to enable Azure Bastion on a second pass to avoid contention.

1. Deploy the `dr` stack with the `pulumi up` command. Once again, this may take up to an hour to provision all the Azure resources specified, including gateways, firewall and bastion hosts:

    ```bash
    $ pulumi up
    ```

1. Once you have both Production and Disaster Recovery stacks (ideally in paired regions), you can connect their hubs using Global (between regions) VNet Peering:

    Required:
    ```bash
    $ pulumi stack select prod
    $ pulumi config set peer dr
    $ pulumi up
    $ pulumi stack select dr
    $ pulumi config set peer prod
    $ pulumi up
    ```
    Optional (for each stack):
    ```bash
    $ pulumi config set org         organization
    $ pulumi config set project     project
    ```

    Note: you may specify another organization and/or project (corresponding hub and spoke names should be the same). It isn't yet [possible](https://github.com/pulumi/pulumi/issues/2800) to discover the Pulumi organization from within the program.

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
