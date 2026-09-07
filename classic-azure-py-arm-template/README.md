[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-py-arm-template/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-py-arm-template/README.md#gh-dark-mode-only)

# Azure Resource Manager (ARM) template

This example simply deploys an existing Azure Resource Manager (ARM) template using Pulumi. This accepts
any existing valid ARM template, enabling easy migration from existing JSON templates and towards infrastructure
as code using Pulumi. Once deployed, it is easy to incrementally refactor resources at a time out of the template
and into code.

[Read more about ARM templates here](
https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/overview).

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init
    ```

1. Set the required configuration variables for this program, and log into Azure:

    ```bash
    pulumi config set azure:environment public
    pulumi config set azure:location westus2
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    az login
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Perform the deployment:

    ```bash
    pulumi up
    ```

    ```
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

## Cleaning up

Once you are done, destroy all of the resources and the stack:

```bash
pulumi destroy
pulumi stack rm
```

## Next steps

For more Azure examples, please [check out the Azure Getting Started Guide](
https://www.pulumi.com/docs/intro/cloud-providers/azure/).
