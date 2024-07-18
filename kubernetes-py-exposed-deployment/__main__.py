"""Copyright 2016-2024, Pulumi Corporation.  All rights reserved."""

import pulumi
import pulumi_kubernetes as k8s

"""Minikube does not implement services of type `LoadBalancer` require the user to specify if we're running on minikube, and if so, create only services of type ClusterIP."""
config = pulumi.Config()
is_minikube = config.require("is_minikube")

"""nginx container, replicated 1 time."""
app_name = "nginx"
app_labels = {"app": app_name}

nginx = k8s.apps.v1.Deployment(
    app_name,
    spec={
        "replicas": 1,
        "selector": {"match_labels": app_labels},
        "template": {
            "metadata": {"labels": app_labels},
            "spec": {
                "containers": [
                    {
                        "name": app_name,
                        "image": "nginx:1.16-alpine",
                    }
                ]
            },
        },
    },
)


"""Allocate an IP to the nginx Deployment."""
frontend = k8s.core.v1.Service(
    app_name,
    metadata={"labels": app_labels},
    spec={
        "selector": app_labels,
        "ports": [{"port": 80, "target_port": 80, "protocol": "TCP"}],
        "type": "ClusterIP" if is_minikube == "true" else "LoadBalancer",
    },
)

# """When "done", this will print the public IP."""
if is_minikube == "true":
    pulumi.export("frontend_IP", frontend.spec.apply(lambda s: s.cluster_ip))
else:
    pulumi.export(
        "frontend_IP",
        frontend.status.apply(
            lambda s: s
            and s.load_balancer
            and s.load_balancer.ingress
            and s.load_balancer.ingress[0].ip
        ),
    )
