import pulumi_digitalocean as do
from pulumi import Config, export, ResourceOptions, CustomTimeouts
from pulumi_kubernetes import Provider
from pulumi_kubernetes.apps.v1 import Deployment, DeploymentSpecArgs
from pulumi_kubernetes.core.v1 import ContainerArgs, PodSpecArgs, PodTemplateSpecArgs, Service, ServicePortArgs, ServiceSpecArgs
from pulumi_kubernetes.meta.v1 import LabelSelectorArgs, ObjectMetaArgs

config = Config()
node_count = config.get_float("nodeCount") or 2
app_replica_count = config.get_float("appReplicaCount") or 5
domain_name = config.get("domainName")

cluster = do.KubernetesCluster(
    "do-cluster",
    region="nyc3",
    version=do.get_kubernetes_versions().latest_version,
    node_pool=do.KubernetesClusterNodePoolArgs(
        name="default",
        size="s-2vcpu-2gb",
        node_count=node_count
    ))

k8s_provider = Provider("do-k8s", kubeconfig=cluster.kube_configs.apply(lambda c: c[0].raw_config))

app_labels = { "app": "app-nginx" }
app = Deployment(
    "do-app-dep",
    spec=DeploymentSpecArgs(
        selector=LabelSelectorArgs(match_labels=app_labels),
        replicas=1,
        template=PodTemplateSpecArgs(
            metadata=ObjectMetaArgs(labels=app_labels),
            spec=PodSpecArgs(containers=[ContainerArgs(name='nginx', image='nginx')]),
        ),
    ), opts=ResourceOptions(provider=k8s_provider))

ingress = Service(
    'do-app-svc',
    spec=ServiceSpecArgs(
        type='LoadBalancer',
        selector=app_labels,
        ports=[ServicePortArgs(port=80)],
    ), opts=ResourceOptions(provider=k8s_provider, custom_timeouts=CustomTimeouts(create="15m", delete="15m")))

ingress_ip = ingress.status.apply(lambda s: s.load_balancer.ingress[0].ip)

export('ingress_ip', ingress_ip)

if domain_name:
    domain = do.Domain(
        "do-domain",
        name=domain_name,
        ip_address=ingress_ip)

    cname_record = do.DnsRecord(
        "do-domain-name",
        domain=domain.name,
        type="CNAME",
        name="www",
        value="@")
