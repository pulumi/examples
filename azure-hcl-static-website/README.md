[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-hcl-static-website/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-hcl-static-website/README.md#gh-dark-mode-only)

# Host a Static Website on Azure Blob Storage, Written in HCL

A static website served from [Azure Blob Storage's static website support](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website),
written in [Pulumi HCL](https://www.pulumi.com/docs/languages-sdks/hcl/). Pulumi installs the HCL
language plugin and the Terraform `azurerm` and `random` providers automatically the first time you
run the program.

## Deploying and running the program

1.  Create a new stack:

    ```bash
    $ pulumi stack init website-testing
    ```

1.  [Configure your Azure credentials](https://www.pulumi.com/registry/packages/azure/installation-configuration/).
    The `azurerm` provider reads the standard `ARM_*` environment variables, and requires
    `ARM_SUBSCRIPTION_ID` to be set.

1.  (Optional) Set the Azure location to deploy into. It defaults to `westus`:

    ```bash
    $ pulumi config set azure-hcl-static-website:location westus2
    ```

1.  Run `pulumi up` to preview and deploy changes. After the preview is shown you will be
    prompted if you want to continue or not.

1.  Open the site URL in a browser to see the rendered HTML:

    ```bash
    $ pulumi stack output endpoint
    https://site***.z22.web.core.windows.net/
    ```

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
