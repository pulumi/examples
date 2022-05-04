package staticwebsite;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.asset.FileAsset;
import com.pulumi.azurenative.cdn.Endpoint;
import com.pulumi.azurenative.cdn.EndpointArgs;
import com.pulumi.azurenative.cdn.Profile;
import com.pulumi.azurenative.cdn.ProfileArgs;
import com.pulumi.azurenative.cdn.enums.QueryStringCachingBehavior;
import com.pulumi.azurenative.cdn.inputs.DeepCreatedOriginArgs;
import com.pulumi.azurenative.resources.ResourceGroup;
import com.pulumi.azurenative.storage.Blob;
import com.pulumi.azurenative.storage.BlobArgs;
import com.pulumi.azurenative.storage.StorageAccount;
import com.pulumi.azurenative.storage.StorageAccountArgs;
import com.pulumi.azurenative.storage.StorageAccountStaticWebsite;
import com.pulumi.azurenative.storage.StorageAccountStaticWebsiteArgs;
import com.pulumi.azurenative.storage.enums.Kind;
import com.pulumi.azurenative.storage.enums.SkuName;
import com.pulumi.azurenative.storage.inputs.SkuArgs;
import com.pulumi.azurenative.storage.outputs.EndpointsResponse;
import com.pulumi.core.Output;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    private static void stack(Context ctx) {
        var resourceGroup = new ResourceGroup("resourceGroup");

        var storageAccount = new StorageAccount("storageaccount",
                StorageAccountArgs.builder().kind(Kind.StorageV2)
                        .resourceGroupName(resourceGroup.name())
                        .sku(SkuArgs.builder()
                                .name(SkuName.Standard_LRS)
                                .build()).build());

        var staticWebsite = new StorageAccountStaticWebsite("staticWebsite",
                StorageAccountStaticWebsiteArgs.builder().accountName(storageAccount.name())
                        .resourceGroupName(resourceGroup.name())
                        .indexDocument("index.html")
                        .error404Document("404.html").build());

        var indexHtml = new Blob("index.html",
                BlobArgs.builder().accountName(storageAccount.name())
                        .resourceGroupName(resourceGroup.name())
                        .containerName(staticWebsite.containerName())
                        .source(new FileAsset("./wwwroot/index.html"))
                        .contentType("text/html").build());

        var notFoundHtml = new Blob("404.html",
                BlobArgs.builder().accountName(storageAccount.name())
                        .resourceGroupName(resourceGroup.name())
                        .containerName(staticWebsite.containerName())
                        .source(new FileAsset("./wwwroot/404.html"))
                        .contentType("text/html").build());

        // Web endpoint to the website.
        ctx.export("staticEndpoint", storageAccount.primaryEndpoints()
                .applyValue(EndpointsResponse::web));

        // (Optional) Add a CDN in front of the storage account.
        var profile = new Profile("profile",
                ProfileArgs.builder().resourceGroupName(resourceGroup.name())
                        .location("global")
                        .sku(com.pulumi.azurenative.cdn.inputs.SkuArgs.builder()
                                .name(com.pulumi.azurenative.cdn.enums.SkuName.Standard_Microsoft)
                                .build()).build());

        var endpointOrigin = storageAccount.primaryEndpoints()
                .applyValue(pe -> pe.web().replace("https://", "").replace("/", ""));

        var endpoint = new Endpoint("endpoint",
                EndpointArgs.builder().isHttpAllowed(false)
                        .isHttpsAllowed(true)
                        .originHostHeader(endpointOrigin)
                        .origins(DeepCreatedOriginArgs.builder()
                                .hostName(endpointOrigin)
                                .httpsPort(443)
                                .name("origin-storage-account")
                                .build())
                        .profileName(profile.name())
                        .queryStringCachingBehavior(QueryStringCachingBehavior.NotSet)
                        .resourceGroupName(resourceGroup.name())
                        .build()
        );


        // CDN endpoint to the website.
        // Allow it some time after the deployment to get ready.
        ctx.export("cdnEndpoint", Output.format("https://%s", endpoint.hostName()));
    }
}
