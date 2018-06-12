import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

import * as azurefunctions from "azure-functions-ts-essentials";

import { signedBlobReadUrl } from "./sas";

export type Context = azurefunctions.Context;
export type HttpRequest = azurefunctions.HttpRequest;
export * from "azure-functions-ts-essentials";

export type AzureFunctionHandler = (context: Context, request: HttpRequest) => void;


async function blobContent(name: string, handler: AzureFunctionHandler): Promise<pulumi.asset.AssetMap> {
    let serializedHandler = await pulumi.runtime.serializeFunction(handler);
    let map: pulumi.asset.AssetMap = {};

    map["host.json"] = new pulumi.asset.StringAsset(JSON.stringify({}));
    map[`${name}/function.json`] = new pulumi.asset.StringAsset(JSON.stringify({
        "disabled": false,
        "bindings": [
            {
                "authLevel": "anonymous",
                "type": "httpTrigger",
                "direction": "in",
                "name": "req"
            },
            {
                "type": "http",
                "direction": "out",
                "name": "$return"
            }
        ]
    }));
    map[`${name}/index.js`] = new pulumi.asset.StringAsset(`module.exports = require("./handler").handler`),
    map[`${name}/handler.js`] = new pulumi.asset.StringAsset(serializedHandler.text);

    return map;
}


// An Azure function exposed via an HTTP endpoint.

export class HttpFunction extends pulumi.ComponentResource {
    readonly resourceGroup: azure.core.ResourceGroup;

    readonly storageAccount: azure.storage.Account;
    readonly storageContainer: azure.storage.Container;
    readonly blob: azure.storage.ZipBlob;

    readonly appServicePlan: azure.appservice.Plan;
    readonly functionApp: azure.appservice.FunctionApp;

    readonly codeBlobUrl: pulumi.Output<string>;
    readonly endpoint: pulumi.Output<string>;

    constructor(name: string, handler: AzureFunctionHandler, options?: pulumi.ResourceOptions) {
        super("azure:HttpFunction", name, {}, options);

        let parentArgs = { parent: this };

        this.resourceGroup = new azure.core.ResourceGroup(`${name}-rg`, {
            location: "West US 2",
        }, parentArgs);

        let resourceGroupArgs = {
            resourceGroupName: this.resourceGroup.name,
            location: this.resourceGroup.location,
        };

        this.storageAccount = new azure.storage.Account(`${name}sa`, {
            ...resourceGroupArgs,
        
            accountKind: "StorageV2",
            accountTier: "Standard",
            accountReplicationType: "LRS",
        }, parentArgs);

        this.storageContainer = new azure.storage.Container(`${name}-c`, {
            resourceGroupName: this.resourceGroup.name,
            storageAccountName: this.storageAccount.name,
            containerAccessType: "private",
        }, parentArgs);

        this.blob = new azure.storage.ZipBlob(`${name}-b`, {
            resourceGroupName: this.resourceGroup.name,
            storageAccountName: this.storageAccount.name,
            storageContainerName: this.storageContainer.name,
            type: "block",
        
            content: new pulumi.asset.AssetArchive(blobContent(name, handler)),
        }, parentArgs);

        this.codeBlobUrl = signedBlobReadUrl(this.blob, this.storageAccount, this.storageContainer);

        this.appServicePlan = new azure.appservice.Plan(`${name}-p`, {
            ...resourceGroupArgs,
        
            kind: "FunctionApp",
        
            // https://social.msdn.microsoft.com/Forums/azure/en-US/665c365d-2b86-4a77-8cea-72ccffef216c
            sku: {
                tier: "Dynamic",
                size: "Y1",
            },
        }, parentArgs);

        this.functionApp = new azure.appservice.FunctionApp(`${name}-app`, {
            ...resourceGroupArgs,
        
            appServicePlanId: this.appServicePlan.id,
            storageConnectionString: this.storageAccount.primaryConnectionString,
        
            appSettings: {
                "WEBSITE_RUN_FROM_ZIP": this.codeBlobUrl,
            },
        }, parentArgs);

        this.endpoint = this.functionApp.defaultHostname.apply(h => {
            return `https://${h}/api/${name}`;
        });
    }
};
