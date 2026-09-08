[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-hcl-static-website/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-hcl-static-website/README.md#gh-dark-mode-only)

# Host a static website on Azure Blob Storage, written in HCL

A static website served from [Azure Blob Storage's static website support](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website),
written in [Pulumi HCL](https://www.pulumi.com/docs/languages-sdks/hcl/). Pulumi installs the HCL
language plugin and the Terraform `azurerm` and `random` providers automatically the first time you
run the program.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/). The
   `azurerm` provider reads the standard `ARM_*` environment variables, and requires
   `ARM_SUBSCRIPTION_ID` to be set.

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init website-testing
    ```

1.  (Optional) Set the Azure location to deploy into. It defaults to `westus`:

    ```bash
    pulumi config set azure-hcl-static-website:location westus2
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

1.  Open the site URL in a browser to see the rendered HTML:

    ```bash
    pulumi stack output endpoint
    ```

    ```
    https://site***.z22.web.core.windows.net/
    ```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
