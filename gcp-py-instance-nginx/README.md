[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-instance-nginx/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-instance-nginx/README.md#gh-dark-mode-only)

# NGINX server using Compute Engine

Starting point for building the Pulumi NGINX server sample in Google Cloud Platform. This example deploys two GCP virtual machines:

- a virtual machine running NGINX via a [startup script](https://cloud.google.com/compute/docs/startupscript)
- a virtual machine running NGINX via a Docker container with Google's [Container-Optimized OS](https://cloud.google.com/container-optimized-os/docs)

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Configure the project:

    ```bash
    export GOOGLE_PROJECT=YOURPROJECTID; export GOOGLE_REGION=asia-east1; export GOOGLE_ZONE=asia-east1-a;
    export GOOGLE_CREDENTIALS=YOURGCPCREDENTIALS
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):
        Type                     Name                    Status
    +   pulumi:pulumi:Stack      gcp-instance-nginx-dev  created
    +   ├─ gcp:compute:Address   poc                     created
    +   ├─ gcp:compute:Network   poc                     created
    +   ├─ gcp:compute:Address   poc-container-instance  created
    +   ├─ gcp:compute:Firewall  poc                     created
    +   ├─ gcp:compute:Instance  poc                     created
    +   └─ gcp:compute:Instance  poc-container-instance  created

    Outputs:
        container_instance_external_ip: "34.66.98.237"
        container_instance_name       : "poc-container-instance-11dddc1"
        instance_external_ip          : "35.192.222.243"
        instance_name                 : "poc-4897b20"

    Resources:
        + 7 created

    Duration: 59s
    ```

1. Curl the HTTP server:

    ```bash
    curl $(pulumi stack output instance_external_ip)
    ```

    This returns the default NGINX test page.

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
