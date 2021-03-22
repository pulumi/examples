# Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

"""Provisions Apache via a Helm chart onto an AKS cluster created in
`cluster.py`.

"""

import pulumi
from pulumi.resource import ResourceOptions
from pulumi_kubernetes.helm.v3 import Chart, ChartOpts

import cluster


apache = Chart('apache-chart',
    ChartOpts(
        chart='apache',
        version='8.3.2',
        fetch_opts={'repo': 'https://charts.bitnami.com/bitnami'}),
    ResourceOptions(provider=cluster.k8s_provider))


apache_service_ip = apache.get_resource('v1/Service', 'apache-chart').apply(
    lambda res: res.status.load_balancer.ingress[0].ip)


pulumi.export('cluster_name', cluster.k8s_cluster.name)
pulumi.export('kubeconfig', cluster.kubeconfig)
pulumi.export('apache_service_ip', apache_service_ip)
