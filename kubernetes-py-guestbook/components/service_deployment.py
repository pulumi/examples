#  Copyright 2016-2020, Pulumi Corporation.
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

from typing import List

import pulumi
from pulumi import ResourceOptions, ComponentResource, Output
from pulumi_kubernetes.apps.v1 import Deployment
from pulumi_kubernetes.core.v1 import Service, Namespace


class ServiceDeployment(ComponentResource):
    deployment: Deployment
    service: Service
    ip_address: Output[str]

    def __init__(self, name: str, image: str,
                 resources: dict = None, replicas: int = None,
                 ports: List[int] = None, allocate_ip_address: bool = None,
                 is_minikube: bool = None, opts: ResourceOptions = None):
        super().__init__('k8sx:component:ServiceDeployment', name, {}, opts)

        labels = {"app": name}
        container = {
            "name": name,
            "image": image,
            "resources": resources or {"requests": {"cpu": "100m", "memory": "100Mi"}},
            "ports": [{"container_port": p} for p in ports] if ports else None,
        }
        self.deployment = Deployment(
            name,
            spec={
                "selector": {"match_labels": labels},
                "replicas": 1,
                "template": {
                    "metadata": {"labels": labels},
                    "spec": {"containers": [container]},
                },
            },
            opts=pulumi.ResourceOptions(parent=self))
        self.service = Service(
            name,
            metadata={
                "name": name,
                "labels": self.deployment.metadata['labels'],
            },
            spec={
                "ports": [{"port": p, "targetPort": p} for p in ports] if ports else None,
                "selector": self.deployment.spec['template']['metadata']['labels'],
                "type": ("ClusterIP" if is_minikube else "LoadBalancer") if allocate_ip_address else None,
            },
            opts=pulumi.ResourceOptions(parent=self))
        if allocate_ip_address:
            if is_minikube:
                self.ip_address = self.service.spec['clusterIP']
            else:
                ingress=self.service.status['load_balancer']['ingress'][0]
                self.ip_address = ingress.apply(lambda i: ingress["ip"] if "ip" in i else ingress['hostname'])
        self.register_outputs({})