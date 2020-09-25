# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import pulumi
from pulumi_kubernetes.apps.v1 import Deployment, DeploymentSpecArgs
from pulumi_kubernetes.core.v1 import ContainerArgs, ContainerPortArgs, PodSpecArgs, PodTemplateSpecArgs
from pulumi_kubernetes.meta.v1 import LabelSelectorArgs, ObjectMetaArgs

config = pulumi.Config()
nginxLabels = {"app": "nginx"}
nginxDeployment = Deployment(
    "nginx-deployment",
    spec=DeploymentSpecArgs(
        selector=LabelSelectorArgs(match_labels=nginxLabels),
        replicas=2 if config.get_int("replicas") is None else config.get_int("replicas"),
        template=PodTemplateSpecArgs(
            metadata=ObjectMetaArgs(labels=nginxLabels),
            spec=PodSpecArgs(
                containers=[ContainerArgs(
                    name="nginx",
                    image="nginx:1.7.9",
                    ports=[ContainerPortArgs(container_port=80)],
                )],
            ),
        ),
    ))

pulumi.export("nginx", nginxDeployment.metadata.apply(lambda m: m.name))
