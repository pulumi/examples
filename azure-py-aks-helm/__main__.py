"""An Azure RM Python Pulumi program"""

import pulumi
from pulumi.resource import ResourceOptions
from pulumi_azure_native import storage
from pulumi_azure_native import resources
from pulumi_kubernetes.helm.v3 import Chart, ChartOpts

import config
import cluster


apache = Chart(
    'apache-chart',
    ChartOpts(
        chart='apache',
        version='8.3.2',
        fetch_opts={'repo': 'https://charts.bitnami.com/bitnami'}),
    ResourceOptions(provider=cluster.k8s_provider))


apache_service_ip = apache \
    .get_resource('v1/Service', 'apache-chart') \
    .apply(lambda res: res.status.load_balancer.ingress[0].ip)


pulumi.export('cluster_name', cluster.k8s_cluster.name)
pulumi.export('kubeconfig', cluster.kubeconfig)
pulumi.export('apache_service_ip', apache_service_ip)
