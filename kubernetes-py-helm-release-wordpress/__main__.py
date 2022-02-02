# Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

"""A Kubernetes Python Pulumi program to deploy a Wordpress chart"""

import pulumi
from pulumi import Output
from pulumi_kubernetes.core.v1 import Service
from pulumi_kubernetes.helm.v3 import Release, ReleaseArgs, RepositoryOptsArgs

# Deploy the bitnami/wordpress chart.
wordpress = Release(
    "wpdev",
    ReleaseArgs(
        chart="wordpress",
        repository_opts=RepositoryOptsArgs(
            repo="https://charts.bitnami.com/bitnami",
        ),
        # Use ClusterIP so no assumptions on support for load balancers, etc. is required.
        version="13.0.6",
        values={
            "service": {
                "type": "ClusterIP",
            }
        },
    ),
)

srv = Service.get("wpdev-wordpress", Output.concat(wordpress.status.namespace, "/", wordpress.status.name, "-wordpress"))
# Export the Cluster IP for Wordpress.
pulumi.export("frontendIp", srv.spec.cluster_ip)
# Command to run to access the wordpress frontend on localhost:8080
cmd = Output.concat("kubectl port-forward svc/", srv.metadata.name, " 8080:80")
pulumi.export("portForwardCommand", cmd)
