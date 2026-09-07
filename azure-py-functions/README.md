[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-functions/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-functions/README.md#gh-dark-mode-only)

# Deploying serverless applications with Azure Functions

This example deploys an Azure Function App with HTTP-triggered serverless functions written in Python.

The application settings configure the app to run on Python 3 and to deploy a specified zip file to the Function App. The app will download the file, extract the code from it, discover the functions, and run them. We've prepared this [zip](https://github.com/tusharshahrs/demo/blob/main/content/lab/pulumi/azure-native/python/app/HelloWithPython.zip) file for you to get started faster; you can find its source code [here](https://github.com/tusharshahrs/demo/tree/main/content/lab/pulumi/azure-native/python/app). The code contains a single HTTP-triggered Azure Function. See [`app/README.md`](./app/README.md) for an optional walkthrough of building the function project yourself.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Log in to the Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Set the Azure region to deploy into. Choose any Azure region that supports the services used in this example ([see this list of available regions](https://azure.microsoft.com/en-us/global-infrastructure/regions/)):

    ```bash
    pulumi config set azure-native:location eastus2
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
        Type                                     Name                        Status
    +   pulumi:pulumi:Stack                      azure-py-functions-dev      created
    +   ├─ azure-native:resources:ResourceGroup  resourcegroup_functions_py  created
    +   ├─ azure-native:web:AppServicePlan       consumption-plan            created
    +   ├─ azure-native:storage:StorageAccount   storageaccount              created
    +   └─ azure-native:web:WebApp               functionapp                 created

    Outputs:
        consumptionplan        : "consumption-plan7b9df5ed"
        endpoint               : "https://functionappfe054af4.azurewebsites.net/api/HelloWithPython"
        function_app           : "functionappfe054af4"
        primarystoragekey      : "[secret]"
        resourcegroup          : "resourcegroup_functions_py4eba2bf2"
        storageaccount         : "storageaccounta6b2e431"
        storageaccountkeys     : "[secret]"
        storageconnectionstring: "[secret]"

    Resources:
        + 5 created

    Duration: 50s
    ```

1. Check the deployed function endpoint via [`pulumi stack output`](https://www.pulumi.com/docs/reference/cli/pulumi_stack_output/), then open it in a browser or curl it:

    ```bash
    curl "$(pulumi stack output endpoint)"
    ```

    ```
    Hello from Python in Pulumi! You have stood up a serverless function in Azure!
    ```

## Cleaning up

Once you are finished, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
