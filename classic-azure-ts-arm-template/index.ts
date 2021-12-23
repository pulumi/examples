// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";

// Create a resource group to deploy all ARM template resources into.
const resourceGroup = new azure.core.ResourceGroup("test");

// Create an ARM template deployment using an ordinary JSON ARM template. This could be read from disk, of course.
const armDeployment = new azure.core.ResourceGroupTemplateDeployment("test-dep", {
    resourceGroupName: resourceGroup.name,
    templateContent: JSON.stringify({
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "outputs": {
        "storageAccountName": {
          "type": "String",
          "value": "[variables('storageAccountName')]",
        },
      },
      "parameters": {
        "storageAccountType": {
          "type": "String",
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
      "variables": {
        "location": "[resourceGroup().location]",
        "storageAccountName": "[concat(uniquestring(resourceGroup().id), 'storage')]",
        "publicIPAddressName": "[concat('myPublicIp', uniquestring(resourceGroup().id))]",
        "publicIPAddressType": "Dynamic",
        "dnsLabelPrefix": `${pulumi.getProject()}-${pulumi.getStack()}`,
      },
    }),
    parametersContent: JSON.stringify({
        "storageAccountType": {
          "value": "Standard_GRS",
        },
    }),
    deploymentMode: "Incremental",
});

// Finally, export the allocated storage account name.
export const storageAccountName = armDeployment.outputContent.apply((content: string) => JSON.parse(content)["storageAccountName"]["value"]);
