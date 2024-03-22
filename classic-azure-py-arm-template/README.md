[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-py-arm-template/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-py-arm-template/README.md#gh-dark-mode-only)

# Azure Resource Manager (ARM) Template

This example simply deploys an existing Azure Resource Manager (ARM) template using Pulumi. This accepts
any existing valid ARM template, enabling easy migration from existing JSON templates and towards infrastructure
as code using Pulumi. Once deployed, it is easy to incrementally refactor resources at a time out of the template
and into code.

[Read more about ARM templates here](
https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/overview).

## Prerequisites

Ensure you have [downloaded and installed the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).

We will be deploying to Azure, so you will need an Azure account. If you don't have an account,
[sign up for free here](https://azure.microsoft.com/en-us/free/). [Follow the instructions
here](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/) to connect Pulumi to your Azure account.

## Running the App

1. Create a new stack:

    ```sh
    $ pulumi stack init
    Enter a stack name: azure-arm-dev
    ```

2. Set the required configuration variables for this program, and log into Azure:

    ```bash
    $ pulumi config set azure:environment public
    $ pulumi config set azure:location westus2
    $ az login
    ```

3. Perform the deployment:

    ```sh
    $ pulumi up
    Updating stack 'azure-arm-dev'
    Performing changes:

         Type                                           Name                      Status
     +   pulumi:pulumi:Stack                            azure-arm--azure-arm-dev  created
     +   ├─ azure:core:ResourceGroup                    rg                        created
     +   └─ azure:core:ResourceGroupTemplateDeployment  arm-dep                   created

    Outputs:
        storageAccountName: "abevrwebgje2wstorage"

    Resources:
        + 3 created

    Duration: 1m8s
    ```

    Notice here that the `storageAccountName` allocated by the ARM template deployment is exported.

4. Tidy up and delete all resources allocated by your deployment:

    ```bash
    $ pulumi destroy -y --skip-preview
    $ pulumi stack rm -y
    ```

## Next Steps

For more Azure examples, please [check out the Azure Getting Started Guide](
https://www.pulumi.com/docs/intro/cloud-providers/azure/).
