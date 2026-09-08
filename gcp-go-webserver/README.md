[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-go-webserver/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-go-webserver/README.md#gh-dark-mode-only)

# Web server using Compute Engine

Starting point for building the Pulumi web server sample in Google Cloud.

This example deploys a Google Compute Engine virtual machine — together with a network and firewall rule that allows SSH and HTTP access — and runs a simple HTTP server on it that responds with `Hello, World!`.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Configure the project:

    ```bash
    pulumi config set gcp:project YOURGOOGLECLOUDPROJECT
    pulumi config set gcp:zone us-central1-a
    ```

1. Install dependencies:

    ```bash
    go mod download
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):

        Type                     Name                                 Status
    +   pulumi:pulumi:Stack      webserver-gcp-dev                    created
    +   ├─ gcp:compute:Network   network                              created
    +   ├─ gcp:compute:Firewall  firewall                             created
    +   └─ gcp:compute:Instance  instance                             created

    Outputs:
        instanceIP  : "35.185.200.158"
        instanceName: "instance-af7e53b"

    Resources:
        + 4 created

    Duration: 1m23s
    ```

1. Curl the HTTP server:

    ```bash
    curl $(pulumi stack output instanceIP)
    ```

    ```
    Hello, World!
    ```

1. SSH into the server:

    ```bash
    gcloud compute ssh $(pulumi stack output instanceName)
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
