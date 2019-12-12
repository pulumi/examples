from pulumi import Config, export
from pulumi_azure import core, storage, hdinsight

config = Config()
username = config.require("username")
password = config.require_secret("password")

resource_group = core.ResourceGroup("spark-rg")

storage_account = storage.Account(
    "sparksa",
    resource_group_name=resource_group.name,
    account_replication_type="LRS",
    account_tier="Standard")

storage_container = storage.Container(
    "spark",
    storage_account_name=storage_account.name,
    container_access_type="private")

spark_cluster = hdinsight.SparkCluster(
    "myspark",
    resource_group_name=resource_group.name,
    cluster_version="3.6",
    component_version={
        "spark": "2.3"
    },
    tier="Standard",
    storage_accounts=[{
        "is_default": "true",
        "storage_account_key": storage_account.primary_access_key,
        "storage_container_id": storage_container.id
    }],
    gateway={
        "enabled": "true",
        "username": username,
        "password": password
    },
    roles={
        "head_node": {
            "vm_size": "Standard_D12_v2",
            "username": username,
            "password": password
        },
        "worker_node": {
            "vm_size": "Standard_D12_v2",
            "username": username,
            "password": password,
            "target_instance_count": "3",
        },
        "zookeeper_node": {
            "vm_size": "Standard_D12_v2",
            "username": username,
            "password": password
        }
    }
)

export("endpoint", spark_cluster.https_endpoint.apply(
    lambda endpoint: "https://" + endpoint
))

