[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-network-component/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-network-component/README.md#gh-dark-mode-only)

# Google Cloud network and instance with ComponentResource

This example uses `pulumi.ComponentResource` as described [here](https://www.pulumi.com/docs/intro/concepts/resources/#components) to create a Google Cloud network and instance.

The use of `pulumi.ComponentResource` demonstrates how multiple low-level resources can be composed into a higher-level, reusable abstraction.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the Google Cloud project and region:

    ```bash
    pulumi config set gcp:project proj-123456
    pulumi config set gcp:region us-central1
    ```

1. Configure one or more subnetwork CIDRs for the program to use. Note: This example uses structured configuration as per [Structured Configuration](https://www.pulumi.com/docs/intro/concepts/config/#structured-configuration):

    ```bash
    pulumi config set --path 'subnet_cidr_blocks[0]' 172.1.0.0/16
    pulumi config set --path 'subnet_cidr_blocks[1]' 172.2.0.0/16
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Run `pulumi up` to preview and deploy the changes:

    ```bash
    pulumi up
    ```

    ```
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
    ```

1. Get the IP address of the newly-created instance from the stack's outputs:

    ```bash
    pulumi stack output nginx_public_ip
    ```

    ```
    13.64.196.146
    ```

1. Check to see that your server is now running:

    ```bash
    curl http://$(pulumi stack output nginx_public_ip)
    ```

    ```
    Powered by Pulumi!
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
