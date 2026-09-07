[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/openstack-py-webserver/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/openstack-py-webserver/README.md#gh-dark-mode-only)

# Web server using OpenStack

A minimal example that provisions a Fedora instance and its security group rules on OpenStack.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Pulumi for OpenStack](https://www.pulumi.com/docs/intro/cloud-providers/openstack/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

   ```bash
   pulumi stack init
   ```

1. Install dependencies:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

1. Modify `__main__.py` to include your keypair and image.

1. Run `pulumi up` to preview and deploy changes:

   ```bash
   pulumi up
   ```

   ```
   Previewing update (dev):
       Type                                  Name           Plan
       pulumi:pulumi:Stack                   pulum-dev
   +   ├─ openstack:images:Image             fedora         create
   +   ├─ openstack:compute:Keypair          default        create
   +   ├─ openstack:networking:SecGroupRule  secgroupRule1  create
   +   ├─ openstack:networking:SecGroupRule  secgroupRule2  create
   +   ├─ openstack:networking:SecGroupRule  secgroupRule3  create
   +   └─ openstack:compute:Instance         test_fedora    create

   Outputs:
   ~ instance_ip: "192.168.0.243" => output<string>

   Resources:
       + 6 to create
       1 unchanged

   Duration: 38s
   ```

1. View the host name and IP address of the instance via `stack output`:

   ```bash
   pulumi stack output
   ```

   ```
   Current stack outputs (1):
       OUTPUT       VALUE
       instance_ip  192.168.0.243
   ```

1. Verify that the OpenStack instance exists, by either using the Horizon dashboard or running `openstack server list`:

   ```bash
   openstack server list
   ```

   ```
   +--------------------------------------+-------------+--------+-------------------------------------+--------------------------+----------+
   | ID                                   | Name        | Status | Networks                            | Image                    | Flavor   |
   +--------------------------------------+-------------+--------+-------------------------------------+--------------------------+----------+
   | 8bdf8a6d-ac53-4448-ae09-e2a08ad554a0 | test_fedora | ACTIVE | public=192.168.0.243, 2001:db8::36b | fedora                   | m1.small |
   +--------------------------------------+-------------+--------+-------------------------------------+--------------------------+----------+
   ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
