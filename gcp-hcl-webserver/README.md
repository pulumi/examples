[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-hcl-webserver/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-hcl-webserver/README.md#gh-dark-mode-only)

# Web server on Google Compute Engine, written in HCL

A simple web server running on a Google Compute Engine instance, written in [Pulumi HCL](https://www.pulumi.com/docs/languages-sdks/hcl/). Pulumi installs the HCL language plugin and the Terraform Google provider automatically the first time you run the program.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the project and zone to deploy into:

    ```bash
    export GOOGLE_PROJECT=my-project
    export GOOGLE_ZONE=us-central1-a
    ```

1. Run `pulumi up` to preview and deploy changes. After the preview is shown, you will be prompted to continue:

    ```bash
    pulumi up
    ```

1. Curl the HTTP server. The instance may take a minute to boot and start serving after the deployment finishes:

    ```bash
    curl $(pulumi stack output instance_ip)
    ```

    ```
    Hello, World!
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
