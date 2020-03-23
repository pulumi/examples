[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Virtual Data Center (VDC)

This example deploys an Azure Virtual Datacenter (VDC) hub-and-spoke network stack in Azure,ready for gateway and firewall deployment (with provision for forced tunnelling). In this implementation, custom routing is used to redirect all traffic to and from Azure and between VNets in Azure through Azure Firewall in the hub, as well as all traffic to and from the DMZ.

The intention is that matching stacks would be defined in paired Azure regions, either in Prod/Disaster Recovery or High Availability configurations. It is possible to define Global VNet Peering between hubs in different stacks.

Although this pattern is in widespread use it has been superseded by the new Virtual Hub and SD-WAN architecture, with the migration plan detailed at:
https://docs.microsoft.com/en-us/azure/virtual-wan/migrate-from-hub-spoke-topology

# Prerequisites

Ensure you have [downloaded and installed the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).

We will be deploying to Azure, so you will need an Azure account. If you don't have an account,
[sign up for free here](https://azure.microsoft.com/en-us/free/).
[Follow the instructions here](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/) to connect Pulumi to your Azure account.

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
    $ pulumi config set dmz_ap    192.168.100.128/25
    $ pulumi config set fw_ap     192.168.100.0/26
    $ pulumi config set fw_as     192.168.100.0/24
    $ pulumi config set fwm_ap    192.168.100.64/26
    $ pulumi config set gw_ap     10.100.0.0/24
    $ pulumi config set hub_ap    10.100.1.0/24
    $ pulumi config set hub_as    10.100.0.0/16
    $ pulumi config set spoke1_ap 10.101.0.0/24
    $ pulumi config set spoke1_as 10.101.0.0/16
    ```

1. Deploy everything with the `pulumi up` command. This provisions all the Azure resources necessary, including
   an Active Directory service principal and AKS clusters:

    ```bash
    $ pulumi up
    ```

1. After a while, your VNets, Gateway and Firewall will be ready. The VNet address spaces will be printed as output
   variables once `pulumi up` completes.

    ```bash
    $ pulumi up
    ...

    Outputs:
      + vdcVnetNames: [
      +     [0]: "vdcvnet-east513be264"
      +     [1]: "vdcvnet-westece285c7"
        ]
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