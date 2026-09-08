[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-appservice/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-appservice/README.md#gh-dark-mode-only)

# Azure App Service with SQL Database and Application Insights

Starting point for building web application hosted in Azure App Service.

Provisions Azure SQL Database and Azure Application Insights to be used in combination
with App Service.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1.  Specify the Azure location to use:

    ```bash
    pulumi config set azure-native:location WestUS
    ```

1.  Define the SQL Server password (make it complex enough to satisfy Azure policy):

    ```bash
    pulumi config set --secret sqlPassword <value>
    ```

1.  Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 10 changes performed:
        + 10 resources created
    Update duration: 1m14.59910109s
    ```

1.  Check the deployed website endpoint:

    ```bash
    pulumi stack output endpoint
    curl "$(pulumi stack output endpoint)"
    ```

    ```
    https://azpulumi-as0ef47193.azurewebsites.net
    <html>
        <body>
            <h1>Greetings from Azure App Service!</h1>
        </body>
    </html>
    ```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
