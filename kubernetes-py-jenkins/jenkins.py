# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import base64
import pulumi
from pulumi import ResourceOptions
from pulumi_kubernetes.apps.v1 import Deployment
from pulumi_kubernetes.core.v1 import PersistentVolumeClaim
from pulumi_kubernetes.core.v1 import Secret
from pulumi_kubernetes.core.v1 import Service

def createDeploymentArgs(name, credentials, resources, image=None):
    image = image if image is not None else {   
        "registry": "docker.io",
        "repository": "bitnami/jenkins",
        "tag": "2.121.2",
        "pullPolicy": "IfNotPresent",
    }

    # This object is a projection of the Kubernetes object model into the Pulumi object model.
    # Its structure is derived from the Deployment object in the Kubernetes API.
    return {
        "metadata": {
            "name": name,
        },
        "spec": {
            "replicas": 1,
            "selector": {
                "matchLabels":  {
                    "app": name,
                },
            },
            "template": {
                "metadata": {
                    "labels": {
                        "app": name,
                    },
                },
                "spec": {
                    "volumes": [
                        {
                            "name": "jenkins-data",
                            "persistentVolumeClaim": {
                                "claimName": name,
                            },
                        },
                    ],
                    "containers": [
                        {
                            "name": name,
                            "image": image["registry"] + "/" + image["repository"] + ":" + image["tag"],
                            "imagePullPolicy": image["pullPolicy"],
                            "env": [
                                {
                                    "name": "JENKINS_USERNAME",
                                    "value": credentials["username"],
                                },
                                {
                                    "name": "JENKINS_PASSWORD",
                                    "valueFrom": {
                                        "secretKeyRef": {
                                            "name": name,
                                            "key": "jenkins-password",
                                        },
                                    },
                                },
                            ],
                            "ports": [
                                {
                                    "name": "http",
                                    "containerPort": 8080,
                                },
                                {
                                    "name": "https",
                                    "containerPort": 8443,
                                },
                            ],
                            "livenessProbe": {
                                "httpGet": {
                                    "path": "/login",
                                    "port": "http",
                                },
                                "initialDelaySeconds": 180,
                                "timeoutSeconds": 5,
                                "failureThreshold": 6,
                            },
                            "readinessProbe": {
                                "httpGet": {
                                    "path": "/login",
                                    "port": "http",
                                },
                                "initialDelaySeconds": 90,
                                "timeoutSeconds": 5,
                                "periodSeconds": 6,
                            },
                            "volumeMounts": [
                                {
                                    "name": "jenkins-data",
                                    "mountPath": "/bitnami/jenkins",
                                },
                            ],
                            "resources": {
                                "requests": {
                                    "memory": resources["memory"],
                                    "cpu": resources["cpu"],
                                },
                            },
                        }, # container
                    ], # containers
                }, # spec
            }, # template
        }, # spec
    } # deployment

# ComponentResource for a Jenkins instance running in a Kubernetes cluster.

class Instance (pulumi.ComponentResource):
    def __init__(self, name, credentials, resources, image=None, opts=None):
        super(Instance, self).__init__("jenkins:jenkins:Instance", name, {"credentials": credentials, "resources": resources, "image": image}, opts)

        # The Secret will contain the root password for this instance.
        secret = Secret(
            name+"-secret",
            metadata={
                "name": name,
            },
            type="Opaque",
            data={
                "jenkins-password": str(base64.b64encode(bytes(credentials["password"],"utf-8"),None),"utf-8"),
            },
            opts=ResourceOptions(parent=self),
        )

        # The PVC provides persistent storage for Jenkins states.
        pvc = PersistentVolumeClaim(
            name+"-pvc", 
            metadata={
                "name": name,
            },
            spec={
                "accessModes": ["ReadWriteOnce"],
                "resources": {
                    "requests": {
                        "storage": "8Gi",
                    },
                },
            },
            opts=ResourceOptions(parent=self),
        )

        # The Deployment describes the desired state for our Jenkins setup.
        deploymentArgs = createDeploymentArgs(name, credentials, resources, image)
        deployment = Deployment(
            name+"-deploy",
            metadata=deploymentArgs["metadata"],
            spec=deploymentArgs["spec"],
            opts=ResourceOptions(parent=self),
        )

        # The Service exposes Jenkins to the external internet by providing load-balanced ingress for HTTP and HTTPS.
        service = Service(
            name+"-service",
            metadata={
                "name": name,
            },
            spec={
                "type": "LoadBalancer",
                "ports": [
                    {
                        "name": "http",
                        "port": 80,
                        "targetPort": "http",
                    },
                    {
                        "name": "https",
                        "port": 443,
                        "targetPort": "https",
                    },
                ],
                "selector": {
                    "app": name,
                },
            },
            opts=ResourceOptions(parent=self)
        )

        # This component resource has no outputs.
        self.register_outputs({})
