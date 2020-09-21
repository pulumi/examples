# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

from typing import NamedTuple

import base64
import pulumi
from pulumi import ResourceOptions
from pulumi_kubernetes.apps.v1 import Deployment, DeploymentSpecArgs
from pulumi_kubernetes.core.v1 import (
    ContainerArgs,
    ContainerPortArgs,
    EnvVarArgs,
    EnvVarSourceArgs,
    HTTPGetActionArgs,
    PersistentVolumeClaim,
    PersistentVolumeClaimSpecArgs,
    PersistentVolumeClaimVolumeSourceArgs,
    PodSpecArgs,
    PodTemplateSpecArgs,
    ProbeArgs,
    ResourceRequirementsArgs,
    Secret,
    SecretKeySelectorArgs,
    Service,
    ServicePortArgs,
    ServiceSpecArgs,
    VolumeArgs,
    VolumeMountArgs,
)
from pulumi_kubernetes.meta.v1 import LabelSelectorArgs, ObjectMetaArgs

class DeploymentArgs(NamedTuple):
    metadata: ObjectMetaArgs
    spec: DeploymentSpecArgs

def create_deployment_args(name, credentials, resources, image=None) -> DeploymentArgs:
    image = image if image is not None else {
        "registry": "docker.io",
        "repository": "bitnami/jenkins",
        "tag": "2.121.2",
        "pullPolicy": "IfNotPresent",
    }

    # This object is a projection of the Kubernetes object model into the Pulumi object model.
    # Its structure is derived from the Deployment object in the Kubernetes API.
    return DeploymentArgs(
        ObjectMetaArgs(name=name),
        DeploymentSpecArgs(
            replicas=1,
            selector=LabelSelectorArgs(
                match_labels={
                    "app": name,
                },
            ),
            template=PodTemplateSpecArgs(
                metadata=ObjectMetaArgs(
                    labels={
                        "app": name,
                    },
                ),
                spec=PodSpecArgs(
                    volumes=[
                        VolumeArgs(
                            name="jenkins-data",
                            persistent_volume_claim=PersistentVolumeClaimVolumeSourceArgs(
                                claim_name=name,
                            ),
                        ),
                    ],
                    containers=[
                        ContainerArgs(
                            name=name,
                            image=image["registry"] + "/" + image["repository"] + ":" + image["tag"],
                            image_pull_policy=image["pullPolicy"],
                            env=[
                                EnvVarArgs(
                                    name="JENKINS_USERNAME",
                                    value=credentials["username"],
                                ),
                                EnvVarArgs(
                                    name="JENKINS_PASSWORD",
                                    value_from=EnvVarSourceArgs(
                                        secret_key_ref=SecretKeySelectorArgs(
                                            name=name,
                                            key="jenkins-password",
                                        ),
                                    ),
                                ),
                            ],
                            ports=[
                                ContainerPortArgs(
                                    name="http",
                                    container_port=8080,
                                ),
                                ContainerPortArgs(
                                    name="https",
                                    container_port=8443,
                                ),
                            ],
                            liveness_probe=ProbeArgs(
                                http_get=HTTPGetActionArgs(
                                    path="/login",
                                    port="http",
                                ),
                                initial_delay_seconds=180,
                                timeout_seconds=5,
                                failure_threshold=6,
                            ),
                            readiness_probe=ProbeArgs(
                                http_get=HTTPGetActionArgs(
                                    path="/login",
                                    port="http",
                                ),
                                initial_delay_seconds=90,
                                timeout_seconds=5,
                                period_seconds=6,
                            ),
                            volume_mounts=[
                                VolumeMountArgs(
                                    name="jenkins-data",
                                    mount_path="/bitnami/jenkins",
                                ),
                            ],
                            resources=ResourceRequirementsArgs(
                                requests={
                                    "memory": resources["memory"],
                                    "cpu": resources["cpu"],
                                },
                            ),
                        ),
                    ],
                ),
            ),
        )
    )


class Instance(pulumi.ComponentResource):
    """
    ComponentResource for a Jenkins instance running in a Kubernetes cluster.
    """

    def __init__(self, name, credentials, resources, image=None, opts=None):
        super().__init__("jenkins:jenkins:Instance", name, {"credentials": credentials, "resources": resources, "image": image}, opts)

        # The Secret will contain the root password for this instance.
        secret = Secret(
            name+"-secret",
            metadata=ObjectMetaArgs(
                name=name,
            ),
            type="Opaque",
            data={
                "jenkins-password": str(base64.b64encode(bytes(credentials["password"],"utf-8"),None),"utf-8"),
            },
            opts=ResourceOptions(parent=self),
        )

        # The PVC provides persistent storage for Jenkins states.
        pvc = PersistentVolumeClaim(
            name+"-pvc",
            metadata=ObjectMetaArgs(
                name=name,
            ),
            spec=PersistentVolumeClaimSpecArgs(
                access_modes=["ReadWriteOnce"],
                resources=ResourceRequirementsArgs(
                    requests={
                        "storage": "8Gi",
                    },
                ),
            ),
            opts=ResourceOptions(parent=self),
        )

        # The Deployment describes the desired state for our Jenkins setup.
        deploymentArgs = create_deployment_args(name, credentials, resources, image)
        deployment = Deployment(
            name+"-deploy",
            metadata=deploymentArgs.metadata,
            spec=deploymentArgs.spec,
            opts=ResourceOptions(parent=self),
        )

        # The Service exposes Jenkins to the external internet by providing load-balanced ingress for HTTP and HTTPS.
        service = Service(
            name+"-service",
            metadata=ObjectMetaArgs(
                name=name,
            ),
            spec=ServiceSpecArgs(
                type="LoadBalancer",
                ports=[
                    ServicePortArgs(
                        name="http",
                        port=80,
                        target_port="http",
                    ),
                    ServicePortArgs(
                        name="https",
                        port=443,
                        target_port="https",
                    ),
                ],
                selector={
                    "app": name,
                },
            ),
            opts=ResourceOptions(parent=self)
        )

        ingress = service.status.apply(lambda s: s.load_balancer.ingress[0])
        self.external_ip = ingress.apply(lambda x: x.ip or x.hostname)
        self.register_outputs({"external_ip": self.external_ip})
