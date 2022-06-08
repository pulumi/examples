package com.pulumi.example.infra;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.asset.FileArchive;
import com.pulumi.azurenative.resources.ResourceGroup;
import com.pulumi.azurenative.storage.Blob;
import com.pulumi.azurenative.storage.BlobArgs;
import com.pulumi.azurenative.storage.BlobContainer;
import com.pulumi.azurenative.storage.BlobContainerArgs;
import com.pulumi.azurenative.storage.StorageAccount;
import com.pulumi.azurenative.storage.StorageAccountArgs;
import com.pulumi.azurenative.storage.StorageFunctions;
import com.pulumi.azurenative.storage.enums.HttpProtocol;
import com.pulumi.azurenative.storage.enums.Kind;
import com.pulumi.azurenative.storage.enums.Permissions;
import com.pulumi.azurenative.storage.enums.SignedResource;
import com.pulumi.azurenative.storage.enums.SkuName;
import com.pulumi.azurenative.storage.inputs.ListStorageAccountKeysArgs;
import com.pulumi.azurenative.storage.inputs.ListStorageAccountServiceSASArgs;
import com.pulumi.azurenative.storage.inputs.SkuArgs;
import com.pulumi.azurenative.web.AppServicePlan;
import com.pulumi.azurenative.web.AppServicePlanArgs;
import com.pulumi.azurenative.web.WebApp;
import com.pulumi.azurenative.web.WebAppArgs;
import com.pulumi.azurenative.web.enums.FtpsState;
import com.pulumi.azurenative.web.enums.SupportedTlsVersions;
import com.pulumi.azurenative.web.inputs.NameValuePairArgs;
import com.pulumi.azurenative.web.inputs.SiteConfigArgs;
import com.pulumi.azurenative.web.inputs.SkuDescriptionArgs;
import com.pulumi.core.Output;
import java.io.File;

public class Main {

    public static void main(String[] args) {
        Pulumi.run(Main::stack);
    }

    private static void stack(Context ctx) {
        // Create a separate resource group for this example.
        var resourceGroup = new ResourceGroup("linux-fn-rg");

        // Storage account is required by Function App.
        // Also, we will upload the function code to the same storage account.
        var storageAccount = new StorageAccount("linux-fn-sa", StorageAccountArgs.builder()
                .resourceGroupName(resourceGroup.name())
                .kind(Kind.StorageV2)
                .sku(SkuArgs.builder()
                        .name(SkuName.Standard_LRS)
                        .build())
                .build());

        // Function code archives will be stored in this container.
        var codeContainer = new BlobContainer("zips", BlobContainerArgs.builder()
                .resourceGroupName(resourceGroup.name())
                .accountName(storageAccount.name())
                .build()
        );

        // Upload Azure Function's code as a zip archive to the storage account.
        var codeBlob = new Blob("zip", BlobArgs.builder()
                .resourceGroupName(resourceGroup.name())
                .accountName(storageAccount.name())
                .containerName(codeContainer.name())
                .source(new FileArchive(findAppArchive().getAbsolutePath()))
                .build()
        );

        // Define a Consumption Plan for the Function App.
        // You can change the SKU to Premium or App Service Plan if needed.
        var plan = new AppServicePlan("plan", AppServicePlanArgs.builder()
                .resourceGroupName(resourceGroup.name())
                .kind("Linux")
                .reserved(true) // required for Linux
                .sku(SkuDescriptionArgs.builder()
                        .tier("Dynamic")
                        .name("Y1")
                        .capacity(1)
                        .build())
                .build());

        // Build the connection string and zip archive's SAS URL. They will go to Function App's settings.
        var storageConnectionString = getConnectionString(resourceGroup.name(), storageAccount.name());
        var codeBlobUrl = signedBlobReadUrl(codeBlob, codeContainer, storageAccount, resourceGroup);

        var app = storageConnectionString.applyValue(
                conn -> new WebApp("function", WebAppArgs.builder()
                        .resourceGroupName(resourceGroup.name())
                        .serverFarmId(plan.getId())
                        .kind("functionapp,linux,container")
                        .httpsOnly(true)
                        .siteConfig(SiteConfigArgs.builder()
                                .numberOfWorkers(1)
                                .minTlsVersion(SupportedTlsVersions._1_2)
                                .ftpsState(FtpsState.Disabled)
                                .appSettings(
                                        NameValuePairArgs.builder().name("AzureWebJobsStorage").value(conn).build(),
                                        NameValuePairArgs.builder().name("WEBSITE_RUN_FROM_PACKAGE").value(codeBlobUrl).build(),
                                        NameValuePairArgs.builder().name("FUNCTIONS_EXTENSION_VERSION").value("~3").build(),
                                        NameValuePairArgs.builder().name("FUNCTIONS_WORKER_RUNTIME").value("powershell").build()
                                ).build())
                        .build())
        );
        ctx.export("functionName", app.apply(WebApp::name));
        ctx.export("endpoint", Output.format(
                "https://%s/api/hello", // 'hello' corresponds to app/src/main/function/hello
                app.apply(WebApp::defaultHostName)
        ));
    }

    static Output<String> getConnectionString(Output<String> resourceGroupName, Output<String> accountName) {
        // Retrieve the primary storage account key.
        var primaryStorageKey = StorageFunctions.listStorageAccountKeys(ListStorageAccountKeysArgs.builder()
                .resourceGroupName(resourceGroupName)
                .accountName(accountName)
                .build())
            .applyValue(r -> r.keys().get(0).value());

        // Build the connection string to the storage account.
        return Output.format(
                "DefaultEndpointsProtocol=https;AccountName=%s;AccountKey=%s",
                accountName, primaryStorageKey
        );
    }

    static Output<String> signedBlobReadUrl(
            Blob blob, BlobContainer container, StorageAccount account, ResourceGroup resourceGroup) {
        var blobSASServiceSasToken = StorageFunctions.listStorageAccountServiceSAS(ListStorageAccountServiceSASArgs.builder()
                    .resourceGroupName(resourceGroup.name())
                    .accountName(account.name())
                    .protocols(HttpProtocol.Https)
                    .sharedAccessExpiryTime("2030-01-01")
                    .sharedAccessStartTime("2021-01-01")
                    .resource(SignedResource.C)
                    .permissions(Permissions.R)
                    .canonicalizedResource(String.format("/blob/%s/%s", account.name(), container.name()))
                    .contentType("application/json")
                    .cacheControl("max-age=5")
                    .contentDisposition("inline")
                    .contentEncoding("deflate")
                    .build())
                .applyValue(sas -> sas.serviceSasToken());
        return Output.format(
                "https://%s.blob.core.windows.net/%s/%s?$%s",
                account.name(), container.name(), blob.name(), blobSASServiceSasToken
        );
    }

    private static File findAppArchive() {
        var files = new File("../app/build/dist")
            .listFiles((dir, name) -> name.endsWith("-app.zip"));
        if (files == null || files.length == 0) {
            throw new IllegalStateException("Could not find app archive in `./app/build/dist/*-app.zip`;"+
                                            " did you run `gradle app:packageDistribution`?");
        }
        if (files.length > 1) {
            throw new IllegalStateException("Found more than one app archive `./app/build/dist/*-app.zip`;"+
                                            " confused which one to use.");
        }
        return files[0];
    }
}
