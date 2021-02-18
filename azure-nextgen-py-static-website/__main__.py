# Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import pulumi
import pulumi_azure_nextgen as azure_nextgen
import pulumi_random as random

# TODO: Remove after autonaming support is added.
random_suffix = random.RandomString("randomSuffix",
    length=10,
    special=False,
    upper=False)

config = pulumi.Config()
storage_account_name = config.get("storageAccountName")
if storage_account_name is None:
    storage_account_name = random_suffix.result.apply(lambda result: f"site{result}")
cdn_endpoint_name = config.get("cdnEndpointName")
if cdn_endpoint_name is None:
    cdn_endpoint_name = storage_account_name.apply(lambda result: f"cdn-endpnt-{result}")
cdn_profile_name = config.get("cdnProfileName")
if cdn_profile_name is None:
    cdn_profile_name = storage_account_name.apply(lambda result: f"cdn-profile-{result}")

resource_group = azure_nextgen.resources.latest.ResourceGroup("resourceGroup",
    resource_group_name=random_suffix.result.apply(lambda result: f"rg{result}"))

profile = azure_nextgen.cdn.latest.Profile("profile",
    profile_name=cdn_profile_name,
    resource_group_name=resource_group.name,
    sku=azure_nextgen.cdn.latest.SkuArgs(
        name=azure_nextgen.cdn.latest.SkuName.STANDARD_MICROSOFT,
    ))

storage_account = azure_nextgen.storage.latest.StorageAccount("storageAccount",
    access_tier=azure_nextgen.storage.latest.AccessTier.HOT,
    account_name=storage_account_name,
    enable_https_traffic_only=True,
    encryption=azure_nextgen.storage.latest.EncryptionArgs(
        key_source=azure_nextgen.storage.latest.KeySource.MICROSOFT_STORAGE,
        services=azure_nextgen.storage.latest.EncryptionServicesArgs(
            blob=azure_nextgen.storage.latest.EncryptionServiceArgs(
                enabled=True,
            ),
            file=azure_nextgen.storage.latest.EncryptionServiceArgs(
                enabled=True,
            ),
        ),
    ),
    kind=azure_nextgen.storage.latest.Kind.STORAGE_V2,
    network_rule_set=azure_nextgen.storage.latest.NetworkRuleSetArgs(
        bypass=azure_nextgen.storage.latest.Bypass.AZURE_SERVICES,
        default_action=azure_nextgen.storage.latest.DefaultAction.ALLOW,
    ),
    resource_group_name=resource_group.name,
    sku=azure_nextgen.storage.latest.SkuArgs(
        name=azure_nextgen.storage.latest.SkuName.STANDARD_LRS,
    ))

endpoint_origin = storage_account.primary_endpoints.apply(
    lambda primary_endpoints: primary_endpoints.web.replace("https://", "").replace("/", ""))

endpoint = azure_nextgen.cdn.latest.Endpoint("endpoint",
    content_types_to_compress=[],
    endpoint_name=cdn_endpoint_name,
    is_compression_enabled=False,
    is_http_allowed=False,
    is_https_allowed=True,
    origin_host_header=endpoint_origin,
    origins=[azure_nextgen.cdn.latest.DeepCreatedOriginArgs(
        host_name=endpoint_origin,
        https_port=443,
        name=pulumi.Output.all(cdn_endpoint_name, random_suffix.result).apply(
            lambda result: f"{result[0]}-origin-{result[1]}"),
    )],
    profile_name=profile.name,
    query_string_caching_behavior=azure_nextgen.cdn.latest.QueryStringCachingBehavior.NOT_SET,
    resource_group_name=resource_group.name)

# Enable static website support
static_website = azure_nextgen.storage.latest.StorageAccountStaticWebsite("staticWebsite",
    account_name=storage_account.name,
    resource_group_name=resource_group.name,
    index_document="index.html",
    error404_document="404.html")

# Upload the files
index_html = azure_nextgen.storage.latest.Blob("index_html",
    blob_name="index.html",
    resource_group_name=resource_group.name,
    account_name=storage_account.name,
    container_name=static_website.container_name,
    type=azure_nextgen.storage.latest.BlobType.BLOCK,
    source=pulumi.FileAsset("./wwwroot/index.html"),
    content_type="text/html")
notfound_html = azure_nextgen.storage.latest.Blob("notfound_html",
    blob_name="404.html",
    resource_group_name=resource_group.name,
    account_name=storage_account.name,
    container_name=static_website.container_name,
    type=azure_nextgen.storage.latest.BlobType.BLOCK,
    source=pulumi.FileAsset("./wwwroot/404.html"),
    content_type="text/html")

# Web endpoint to the website
pulumi.export("staticEndpoint", storage_account.primary_endpoints.web)

# CDN endpoint to the website.
# Allow it some time after the deployment to get ready.
pulumi.export("cdnEndpoint", endpoint.host_name.apply(lambda host_name: f"https://{host_name}"))
