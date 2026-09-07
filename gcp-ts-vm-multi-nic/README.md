[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-vm-multi-nic/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-vm-multi-nic/README.md#gh-dark-mode-only)

# GCP VM with multiple NICs on separate VPCs

This example provisions a Google Compute Engine VM with a configurable number of
network interfaces, where each NIC is attached to its own dedicated VPC network
and subnet. GCE requires that every NIC on a VM lives in a distinct VPC, so this
example creates `nicCount` VPCs, one subnet per VPC, the matching firewall
rules, and then wires all of them into a single `gcp.compute.Instance` via a
dynamically-built `networkInterfaces` list.

Use cases:
- Multi-homed appliances (firewalls, NVAs, routers) that need a foot in several
  networks.
- Connecting workloads that span a "management" VPC and one or more "data" VPCs.
- Testing inter-VPC routing without VPC peering.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. Access to the `lumitorch` Pulumi organization and the
   `cloud-creds/gcp-dev-sandbox` ESC environment (already referenced from
   `Pulumi.yaml`).

## Deploying the example

1. Install dependencies:

    ```bash
    npm install
    ```

2. Initialize a stack in the `lumitorch` org:

    ```bash
    pulumi stack init lumitorch/dev
    ```

    The stack inherits GCP credentials from the ESC environment
    `cloud-creds/gcp-dev-sandbox` declared in `Pulumi.yaml`, so you do not need to
    set `gcp:project` or run `gcloud auth` locally.

3. (Optional) Tune the NIC count:

    ```bash
    pulumi config set nicCount 4
    pulumi config set machineType n2-standard-8   # n2-standard-8 supports up to 8 NICs
    ```

    GCE caps the number of NICs per VM by machine type — see
    [Multiple network interfaces overview](https://cloud.google.com/vpc/docs/multiple-interfaces-concepts#max-interfaces)
    for the matrix.

4. Deploy the stack:

    ```bash
    pulumi up
    ```

    Outputs include the VM name, zone, and a `nicSummary` array showing each NIC's
    network, subnetwork, internal IP, and (for NIC 0) external IP.

5. SSH in via IAP. Only NIC 0 receives a public IP, and the firewall only opens
   port 22 to the [IAP TCP forwarding range](https://cloud.google.com/iap/docs/using-tcp-forwarding):

    ```bash
    gcloud compute ssh multi-nic-vm --zone $(pulumi stack output vmZone) --tunnel-through-iap
    ```

    Once inside, `ip -br addr` lists `ens4`, `ens5`, ... — one interface per NIC.

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```

## Summary

You built a GCE VM with a dynamic number of NICs, each on its own VPC, using
Pulumi TypeScript and a Pulumi ESC environment for credentials. From here you
can layer routes, add a second VM in any of the secondary VPCs, or swap the
hardcoded Debian image for a network-appliance image.
