import pulumi
from pulumi.resource import ResourceOptions
from pulumi_kubernetes.helm.v3 import Chart, ChartOpts

import cluster

def remove_status(obj, opts):
    if obj["kind"] == "CustomResourceDefinition":
        del obj["status"]

apache = Chart('keda-chart',
    ChartOpts(
        chart='keda',
        version='2.3.0',
        transformations=[remove_status],
        fetch_opts={'repo': 'https://kedacore.github.io/charts'}),
    ResourceOptions(provider=cluster.k8s_provider))


pulumi.export('cluster_name', cluster.k8s_cluster.name)
pulumi.export('kubeconfig', cluster.kubeconfig)
