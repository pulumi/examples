# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import pulumi
from pulumi_kubernetes.apps.v1 import Deployment

config = pulumi.Config()
nginxLabels = { "app": "nginx" }
nginxDeployment = Deployment(
    "nginx-deployment", 
    spec={
        "selector": { "matchLabels": nginxLabels },
        "replicas": 2 if config.get_int("replicas") is None else config.get_int("replicas"),
        "template": {
            "metadata": { "labels": nginxLabels },
            "spec": {
                "containers": [{
                    "name": "nginx",
                    "image": "nginx:1.7.9",
                    "ports": [{ "containerPort": 80 }],
                }],
            },
        },
    })

pulumi.export("nginx", nginxDeployment.metadata["name"])
