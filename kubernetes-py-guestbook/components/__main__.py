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

import pulumi
from service_deployment import ServiceDeployment

# Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
# running on minikube, and if so, create only services of type ClusterIP.
config = pulumi.Config()
isMinikube = config.get_bool("isMinikube")

ServiceDeployment(
    "redis-master",
    image="k8s.gcr.io/redis:e2e",
    ports=[6379])
ServiceDeployment(
    "redis-slave",
    image="gcr.io/google_samples/gb-redisslave:v1",
    ports=[6379])
frontend = ServiceDeployment(
    "frontend",
    image="gcr.io/google-samples/gb-frontend:v4",
    replicas=3,
    ports=[80],
    allocate_ip_address=True,
    is_minikube=config.get_bool("isMinikube"))

pulumi.export("frontend_ip", frontend.ip_address)
