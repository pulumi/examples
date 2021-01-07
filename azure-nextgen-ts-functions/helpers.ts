// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as storage from "@pulumi/azure-nextgen/storage/latest";
import * as pulumi from "@pulumi/pulumi";

export function getConnectionString(resourceGroupName: pulumi.Input<string>, accountName: pulumi.Input<string>): pulumi.Output<string> {
    // Retrieve the primary storage account key.
    const storageAccountKeys = pulumi.all([resourceGroupName, accountName]).apply(([resourceGroupName, accountName]) =>
        storage.listStorageAccountKeys({ resourceGroupName, accountName }));
    const primaryStorageKey = storageAccountKeys.keys[0].value;

    // Build the connection string to the storage account.
    return pulumi.interpolate`DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${primaryStorageKey}`;
}

export function signedBlobReadUrl(resourceGroupName: pulumi.Input<string>, accountName: pulumi.Input<string>, containerName: pulumi.Input<string>, blobName: pulumi.Input<string>): pulumi.Output<string> {
    const primaryConnectionString = getConnectionString(resourceGroupName, accountName);

    // Choose a fixed, far-future expiration date for signed blob URLs. The shared access signature
    // (SAS) we generate for the Azure storage blob must remain valid for as long as the Function
    // App is deployed, since new instances will download the code on startup. By using a fixed
    // date, rather than (e.g.) "today plus ten years", the signing operation is idempotent.
    const signatureExpiration = "2100-01-01";

    return pulumi.all([accountName, primaryConnectionString, containerName, blobName]).apply(
        async ([accountName, connectionString, containerName, blobName]) => {
            const sas = await azure.storage.getAccountBlobContainerSAS({
                connectionString,
                containerName,
                start: "2019-01-01",
                expiry: signatureExpiration,
                permissions: {
                    read: true,
                    write: false,
                    delete: false,
                    list: false,
                    add: false,
                    create: false,
                },
            }, { async: true });

            return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}${sas.sas}`;
        });
}
