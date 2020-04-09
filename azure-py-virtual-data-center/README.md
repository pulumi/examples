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
    $ pulumi config set azure:environment public
    $ pulumi config set azure:location australiasoutheast
    $ pulumi config set dmz_ar    192.168.100.128/25
    $ pulumi config set fwm_ar    192.168.100.64/26
    $ pulumi config set fws_ar    192.168.100.0/26
    $ pulumi config set fwz_as    192.168.100.0/24
    $ pulumi config set gws_ar    10.100.0.0/26
    $ pulumi config set hbs_ar    10.100.0.64/27
    $ pulumi config set hub_ar    10.100.1.0/24
    $ pulumi config set hub_as    10.100.0.0/16
    $ pulumi config set sbs_ar    10.101.0.0/27
    $ pulumi config set spoke_ar  10.101.1.0/24
    $ pulumi config set spoke_as  10.101.0.0/16
    ```

1. Deploy everything with the `pulumi up` command. This provisions all the Azure resources necessary, including gateways and firewall which will take up to an hour:

    ```bash
    $ pulumi up
    ```

1. After a while, your VDC will be ready. The VNet address spaces will be printed as output
   variables once `pulumi up` completes.

    ```bash
    $ pulumi up
    ...

    Outputs:
      + hub_er_gw     : "hub-er-gw-261ec575"
      + hub_er_gw_pip : "23.101.233.172"
      + hub_fw        : "hub-fw-9d706931"
      + hub_fw_ip     : "192.168.100.4"
      + hub_fw_pip    : "20.40.167.228"
      + hub_vpn_gw    : "hub-vpn-gw-11b5fdfa"
      + hub_vpn_gw_pip: "23.101.235.252"
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