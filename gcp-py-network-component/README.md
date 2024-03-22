[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-network-component/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-network-component/README.md#gh-dark-mode-only)

# Google Cloud Network and Instance with ComponentResource

This example uses `pulumi.ComponentResource` as described [here](https://www.pulumi.com/docs/intro/concepts/resources/#components)
to create a Google Cloud Network and instance.

The use of `pulumi.ComponentResource` demonstrates how multiple low-level resources
can be composed into a higher-level, reusable abstraction.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for Google Cloud](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying and running the program

1. Create a new stack:

    ```bash
    $ pulumi stack init
    ```

1. Set the Google Cloud project and region

    ```bash
    $ pulumi config set gcp:project proj-123456
    $ pulumi config set gcp:region us-central1
    ```

1. Configure one or more subnetwork CIDRs for the program to use
   Note: This example is using structured configuration as per [Structured Configuration](https://www.pulumi.com/docs/intro/concepts/config/#structured-configuration)

    ```bash
    $ pulumi config set --path 'subnet_cidr_blocks[0]' 172.1.0.0/16
    $ pulumi config set --path 'subnet_cidr_blocks[1]' 172.2.0.0/16
    ```

1. Run `pulumi up` to preview and deploy the changes:

    ```bash
    $ pulumi up -y
    Previewing update (dev):

        Type                             Name                          Plan
    +   pulumi:pulumi:Stack              gcp-py-network-component-dev  create
    +   ├─ my:modules:Vpc                demo                          create
    +   │  └─ gcp:compute:Network        demo                          create
    +   │     ├─ gcp:compute:Subnetwork  demo-0                        create
    +   │     ├─ gcp:compute:Subnetwork  demo-1                        create
    +   │     ├─ gcp:compute:Router      demo                          create
    +   │     └─ gcp:compute:RouterNat   demo                          create
    +   └─ my:modules:Instance           demo                          create
    +      ├─ gcp:compute:Address        demo-nginx                    create
    +      ├─ gcp:compute:Firewall       demo-nginx                    create
    +      └─ gcp:compute:Instance       demo-nginx                    create

    Resources:
        + 11 to create

    Updating (dev):

        Type                             Name                          Status
    +   pulumi:pulumi:Stack              gcp-py-network-component-dev  created
    +   ├─ my:modules:Vpc                demo                          created
    +   │  └─ gcp:compute:Network        demo                          created
    +   │     ├─ gcp:compute:Subnetwork  demo-0                        created
    +   │     ├─ gcp:compute:Subnetwork  demo-1                        created
    +   │     ├─ gcp:compute:Router      demo                          created
    +   │     └─ gcp:compute:RouterNat   demo                          created
    +   └─ my:modules:Instance           demo                          created
    +      ├─ gcp:compute:Address        demo-nginx                    created
    +      ├─ gcp:compute:Firewall       demo-nginx                    created
    +      └─ gcp:compute:Instance       demo-nginx                    created

    Outputs:
        network  : "demo-7a734d7"
        public_ip: "34.66.58.210"

    Resources:
        + 11 created

    Duration: 46s

    Permalink: https://app.pulumi.com/clstokes/gcp-py-network-component/dev/updates/10
    ```

1. Get the IP address of the newly-created instance from the stack's outputs:

    ```bash
    $ pulumi stack output nginx_public_ip
    13.64.196.146
    ```

1. Check to see that your server is now running:

    ```bash
    $ curl http://$(pulumi stack output nginx_public_ip)
    Powered by Pulumi!
    ```

1. Destroy the stack:

    ```bash
    $ pulumi destroy -y
    Previewing destroy (dev):

        Type                             Name                          Plan
    -   pulumi:pulumi:Stack              gcp-py-network-component-dev  delete
    -   ├─ my:modules:Vpc                demo                          delete
    -   │  └─ gcp:compute:Network        demo                          delete
    -   │     ├─ gcp:compute:RouterNat   demo                          delete
    -   │     ├─ gcp:compute:Router      demo                          delete
    -   │     ├─ gcp:compute:Subnetwork  demo-1                        delete
    -   │     └─ gcp:compute:Subnetwork  demo-0                        delete
    -   └─ my:modules:Instance           demo                          delete
    -      ├─ gcp:compute:Firewall       demo-nginx                    delete
    -      ├─ gcp:compute:Instance       demo-nginx                    delete
    -      └─ gcp:compute:Address        demo-nginx                    delete

    Outputs:
    - network  : "demo-7a734d7"
    - nginx_public_ip: "34.66.58.210"

    Resources:
        - 11 to delete

    Destroying (dev):

        Type                             Name                          Status
    -   pulumi:pulumi:Stack              gcp-py-network-component-dev  deleted
    -   ├─ my:modules:Vpc                demo                          deleted
    -   │  └─ gcp:compute:Network        demo                          deleted
    -   │     ├─ gcp:compute:RouterNat   demo                          deleted
    -   │     ├─ gcp:compute:Router      demo                          deleted
    -   │     ├─ gcp:compute:Subnetwork  demo-1                        deleted
    -   │     └─ gcp:compute:Subnetwork  demo-0                        deleted
    -   └─ my:modules:Instance           demo                          deleted
    -      ├─ gcp:compute:Firewall       demo-nginx                    deleted
    -      ├─ gcp:compute:Instance       demo-nginx                    deleted
    -      └─ gcp:compute:Address        demo-nginx                    deleted

    Outputs:
    - network  : "demo-7a734d7"
    - nginx_public_ip: "34.66.58.210"

    Resources:
        - 11 deleted

    Duration: 4m40s

    Permalink: https://app.pulumi.com/clstokes/gcp-py-network-component/dev/updates/11
    The resources in the stack have been deleted, but the history and configuration associated with the stack are still maintained.
    If you want to remove the stack completely, run 'pulumi stack rm dev'.
    ```
