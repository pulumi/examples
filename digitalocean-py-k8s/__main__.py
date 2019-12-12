import pulumi_digitalocean as do
from pulumi import Config, export, Output, ResourceOptions
from pulumi_kubernetes import Provider
from pulumi_kubernetes.apps.v1 import Deployment
from pulumi_kubernetes.core.v1 import Service

config = Config()
node_count = config.get_float("nodeCount") or 3
app_replica_count = config.get_float("appReplicaCount") or 5
domain_name = config.get("domainName")

cluster = do.KubernetesCluster(
    "do-cluster",
    region="sfo2",
    version="latest",
    node_pool={
        "name": "default",
        "size": "s-2vcpu-2gb",
        "node_count": node_count
    })

k8s_provider = Provider("do-k8s", kubeconfig=cluster.kube_configs[0]["rawConfig"] )

app_labels = { "app": "app-nginx" }
app = Deployment(
    "do-app-dep",
    spec={
        'selector': { 'matchLabels': app_labels },
        'replicas': 1,
        'template': {
            'metadata': { 'labels': app_labels },
            'spec': { 'containers': [{ 'name': 'nginx', 'image': 'nginx' }] },
        },
    }, __opts__=ResourceOptions(provider=k8s_provider))

ingress = Service(
    'do-app-svc',
    spec={
        'type': 'LoadBalancer',
        'selector': app_labels,
        'ports': [{'port': 80}],
    }, __opts__=ResourceOptions(provider=k8s_provider, custom_timeouts={"create":"15m", "delete": "15m"}))

ingress_ip=ingress.status['load_balancer']['ingress'][0]['ip']

export('ingress_ip', ingress_ip)

if domain_name:
    domain = do.Domain(
        "do-domain",
        name=domain_name,
        ip_address=ingress_ip)

    cname_record = do.DnsRecord(
        "do-domain-name",
        domain=domain_name,
        type="CNAME",
        name="www",
        value="@")
