# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import pulumi
import jenkins

# Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
# running on minikube, and if so, create only services of type ClusterIP.
config = pulumi.Config()
if config.require("isMinikube") == "true":
    raise Exception("This example does not yet support minikube")

instance = jenkins.Instance(
    name=pulumi.get_stack(),
    credentials={
        "username": config.require("username"),
        "password": config.require("password"),
    },
    resources={
        "memory": "512Mi",
        "cpu": "100m",
    },
)
pulumi.export("external_ip", instance.external_ip)
