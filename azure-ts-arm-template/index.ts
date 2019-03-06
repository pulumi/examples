// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

// Create a resource group to deploy all ARM template resources into.
const resourceGroup = new azure.core.ResourceGroup("test", { location: "WestUS" });

// Create an ARM template deployment using an ordinary JSON ARM template. This could be read from disk, of course.
const armDeployment = new azure.core.TemplateDeployment("test-dep", {
    resourceGroupName: resourceGroup.name,
    templateBody: JSON.stringify({
      "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "storageAccountType": {
          "type": "string",
          "defaultValue": "Standard_LRS",
          "allowedValues": [
            "Standard_LRS",
            "Standard_GRS",
            "Standard_ZRS"
          ],
          "metadata": {
            "description": "Storage Account type"
          }
        }
      },
      "variables": {
        "location": "[resourceGroup().location]",
        "storageAccountName": "[concat(uniquestring(resourceGroup().id), 'storage')]",
        "publicIPAddressName": "[concat('myPublicIp', uniquestring(resourceGroup().id))]",
        "publicIPAddressType": "Dynamic",
        "apiVersion": "2015-06-15",
        "dnsLabelPrefix": `${pulumi.getProject()}-${pulumi.getStack()}`
      },
      "resources": [
        {
          "type": "Microsoft.Storage/storageAccounts",
          "name": "[variables('storageAccountName')]",
          "apiVersion": "[variables('apiVersion')]",
          "location": "[variables('location')]",
          "properties": {
            "accountType": "[parameters('storageAccountType')]"
          }
        },
        {
          "type": "Microsoft.Network/publicIPAddresses",
          "apiVersion": "[variables('apiVersion')]",
          "name": "[variables('publicIPAddressName')]",
          "location": "[variables('location')]",
          "properties": {
            "publicIPAllocationMethod": "[variables('publicIPAddressType')]",
            "dnsSettings": {
              "domainNameLabel": "[variables('dnsLabelPrefix')]"
            }
          }
        }
      ],
      "outputs": {
        "storageAccountName": {
          "type": "string",
          "value": "[variables('storageAccountName')]"
        }
      }
    }),
    parameters: {
        "storageAccountType": "Standard_GRS",
    },
    deploymentMode: "Incremental",
});

// Finally, export the allocated storage account name.
export const storageAccountName = armDeployment.outputs["storageAccountName"];
