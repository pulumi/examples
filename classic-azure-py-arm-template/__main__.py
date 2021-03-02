# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import json

import pulumi_azure as azure
from pulumi import export, get_project, get_stack


# Create a resource group to deploy all ARM template resources into.
resource_group = azure.core.ResourceGroup('test')

# Specifies an ordinary JSON ARM template.
template = {
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "storageAccountType": {
            "type": "string",
            "defaultValue": "Standard_LRS",
            "allowedValues": [
                "Standard_LRS",
                "Standard_GRS",
                "Standard_ZRS",
            ],
            "metadata": {
                "description": "Storage Account type",
            },
        },
    },
    "variables": {
        "location": "[resourceGroup().location]",
        "storageAccountName": "[concat(uniquestring(resourceGroup().id), 'storage')]",
        "publicIPAddressName": "[concat('myPublicIp', uniquestring(resourceGroup().id))]",
        "publicIPAddressType": "Dynamic",
        "dnsLabelPrefix": f"{get_project()}-{get_stack()}",
    },
    "resources": [
        {
            "type": "Microsoft.Storage/storageAccounts",
            "name": "[variables('storageAccountName')]",
            "apiVersion": "2019-04-01",
            "location": "[variables('location')]",
            "sku": {
                "name": "[parameters('storageAccountType')]",
            },
        },
        {
            "type": "Microsoft.Network/publicIPAddresses",
            "apiVersion": "2019-09-01",
            "name": "[variables('publicIPAddressName')]",
            "location": "[variables('location')]",
            "properties": {
                "publicIPAllocationMethod": "[variables('publicIPAddressType')]",
                "dnsSettings": {
                    "domainNameLabel": "[variables('dnsLabelPrefix')]",
                },
            },
        },
    ],
    "outputs": {
        "storageAccountName": {
            "type": "string",
            "value": "[variables('storageAccountName')]",
        },
    }
}

# Create an ARM template deployment using the ordinary JSON ARM template as specified above. This could be read from disk, of course.
arm_deployment = azure.core.TemplateDeployment('test-dep',
    resource_group_name=resource_group.name,
    template_body=json.dumps(template),
    parameters={
        'storageAccountType': 'Standard_GRS'
    },
    deployment_mode='Incremental',
)

# Finally, export the allocated storage account name.
export('storageAccountName', arm_deployment.outputs['storage_account_name'])
