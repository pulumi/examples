[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/openstack-py-webserver/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/openstack-py-webserver/README.md#gh-dark-mode-only)

# Web Server Using Openstack


## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for Openstack](https://www.pulumi.com/docs/intro/cloud-providers/openstack/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying and running the program

1. Create a new stack:

    ```bash
    $ pulumi stack init
    ```

2. Modify `__main__.py` to include your keypair and image

3. Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
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
    Resources:
        + 6 created
        1 unchanged

    Duration: 38s

    ```

4. View the host name and IP address of the instance via `stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT       VALUE
        instance_ip  192.168.0.243
    ```

5.  Verify that the Openstack instance exists, by either using the Horizon dashboard or running `openstack server list`.
    ```bash
    $ openstack server list
    +--------------------------------------+-------------+--------+-------------------------------------+--------------------------+----------+
    | ID                                   | Name        | Status | Networks                            | Image                    | Flavor   |
    +--------------------------------------+-------------+--------+-------------------------------------+--------------------------+----------+
    | 8bdf8a6d-ac53-4448-ae09-e2a08ad554a0 | test_fedora | ACTIVE | public=192.168.0.243, 2001:db8::36b | fedora                   | m1.small |
    +--------------------------------------+-------------+--------+-------------------------------------+--------------------------+----------+
    ```

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
