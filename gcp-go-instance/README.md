[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-go-instance/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-go-instance/README.md#gh-dark-mode-only)

# GCP instance

Create a GCP instance using Pulumi and Go.

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
        Type                     Name          Status
    +   pulumi:pulumi:Stack      gcp-instance  created
    +   └─ gcp:compute:Instance  instance      created

    Outputs:
        instanceName: "instance-6beb431"

    Resources:
        + 2 created

    Duration: 23s
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
