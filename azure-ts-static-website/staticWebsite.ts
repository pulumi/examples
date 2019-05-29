// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

export interface StorageStaticWebsiteArgs {
    accountName: pulumi.Input<string>;
}

const accountNameProp = "accountName";

// There's currently no way to enable the Static Web Site feature of a storage account via ARM
// Therefore, we created a custom provider which wraps corresponding Azure CLI commands
class StorageStaticWebsiteProvider implements pulumi.dynamic.ResourceProvider {

    check = async (olds: any, news: any) => {
        const failedChecks = [];

        if (news[accountNameProp] === undefined) {
            failedChecks.push({property: accountNameProp, reason: `required property '${accountNameProp}' missing`});
        }

        return { inputs: news, failedChecks: failedChecks };
    }

    diff = async (id: pulumi.ID, olds: any, news: any) => {
        const replaces = [];

        if (olds[accountNameProp] !== news[accountNameProp]) {
            replaces.push(accountNameProp);
        }

        return { replaces: replaces };
    }

    create = async (inputs: any) => {
        const { execSync } = require("child_process");
        execSync("az extension add --name storage-preview", { stdio: "ignore" });

        const accountName = inputs[accountNameProp];
        const executeToJson = (command: string) => JSON.parse(execSync(command, { stdio: ["pipe", "pipe", "ignore"] }).toString());
        const update = executeToJson(`az storage blob service-properties update --account-name "${accountName}" --static-website --404-document 404.html --index-document index.html`);
        if (!update.staticWebsite.enabled) {
            throw new Error(`Static website update failed: ${update}`);
        }

        const endpoint = executeToJson(`az storage account show -n "${accountName}" --query "primaryEndpoints.web"`);
        const hostName = endpoint.replace("https://", "").replace("/", "");
        const webContainerName = "$web";
        return { 
            id: `${accountName}StaticWebsite`,
            outs: { endpoint, hostName, webContainerName }
        };
    }
}

export class StorageStaticWebsite extends pulumi.dynamic.Resource {
    public readonly endpoint: pulumi.Output<string>;
    public readonly hostName: pulumi.Output<string>;
    public readonly webContainerName: pulumi.Output<string>;

    constructor(name: string, args: StorageStaticWebsiteArgs, opts?: pulumi.CustomResourceOptions) {
        super(new StorageStaticWebsiteProvider(), name, { ...args, endpoint: undefined, hostName: undefined, webContainerName: undefined }, opts);
    }
}
