// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import * as pulumi from "@pulumi/pulumi";

export function getConnectionString(resourceGroupName: pulumi.Input<string>, accountName: pulumi.Input<string>): pulumi.Output<string> {
    // Retrieve the primary storage account key.
    const storageAccountKeys = storage.listStorageAccountKeysOutput({ resourceGroupName, accountName });
    const primaryStorageKey = storageAccountKeys.keys[0].value;

    // Build the connection string to the storage account.
    return pulumi.interpolate`DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${primaryStorageKey}`;
}

export function signedBlobReadUrl(blob: storage.Blob,
                                  container: storage.BlobContainer,
                                  account: storage.StorageAccount,
                                  resourceGroup: resources.ResourceGroup): pulumi.Output<string> {

    const blobSAS = storage.listStorageAccountServiceSASOutput({
        accountName: account.name,
        protocols: storage.HttpProtocol.Https,
        sharedAccessExpiryTime: "2030-01-01",
        sharedAccessStartTime: "2021-01-01",
        resourceGroupName: resourceGroup.name,
        resource: storage.SignedResource.C,
        permissions: storage.Permissions.R,
        canonicalizedResource: pulumi.interpolate`/blob/${account.name}/${container.name}`,
        contentType: "application/json",
        cacheControl: "max-age=5",
        contentDisposition: "inline",
        contentEncoding: "deflate",
    });
    return pulumi.interpolate`https://${account.name}.blob.core.windows.net/${container.name}/${blob.name}?${blobSAS.serviceSasToken}`;
}
