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
from pulumi_kubernetes.apps.v1 import Deployment, DeploymentSpecArgs
from pulumi_kubernetes.core.v1 import (
	ContainerArgs,
	ContainerPortArgs,
	EnvVarArgs,
	PodSpecArgs,
	PodTemplateSpecArgs,
	ResourceRequirementsArgs,
	Service,
	ServicePortArgs,
	ServiceSpecArgs,
)
from pulumi_kubernetes.meta.v1 import LabelSelectorArgs, ObjectMetaArgs

# Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
# running on minikube, and if so, create only services of type ClusterIP.
config = pulumi.Config()
isMinikube = config.get_bool("isMinikube")

redis_leader_labels = {
	"app": "redis-leader",
}

redis_leader_deployment = Deployment(
	"redis-leader",
	spec=DeploymentSpecArgs(
		selector=LabelSelectorArgs(
			match_labels=redis_leader_labels,
		),
		replicas=1,
		template=PodTemplateSpecArgs(
			metadata=ObjectMetaArgs(
				labels=redis_leader_labels,
			),
			spec=PodSpecArgs(
				containers=[ContainerArgs(
					name="redis-leader",
					image="redis",
					resources=ResourceRequirementsArgs(
						requests={
							"cpu": "100m",
							"memory": "100Mi",
						},
					),
					ports=[ContainerPortArgs(
						container_port=6379,
					)],
				)],
			),
		),
	))

redis_leader_service = Service(
	"redis-leader",
	metadata=ObjectMetaArgs(
		name="redis-leader",
		labels=redis_leader_labels
	),
	spec=ServiceSpecArgs(
		ports=[ServicePortArgs(
			port=6379,
			target_port=6379,
		)],
		selector=redis_leader_labels
	))

redis_replica_labels = {
	"app": "redis-replica",
}

redis_replica_deployment = Deployment(
	"redis-replica",
	spec=DeploymentSpecArgs(
		selector=LabelSelectorArgs(
			match_labels=redis_replica_labels
		),
		replicas=1,
		template=PodTemplateSpecArgs(
			metadata=ObjectMetaArgs(
				labels=redis_replica_labels,
			),
			spec=PodSpecArgs(
				containers=[ContainerArgs(
					name="redis-replica",
					image="pulumi/guestbook-redis-replica",
					resources=ResourceRequirementsArgs(
						requests={
							"cpu": "100m",
							"memory": "100Mi",
						},
					),
					env=[EnvVarArgs(
						name="GET_HOSTS_FROM",
						value="dns",
						# If your cluster config does not include a dns service, then to instead access an environment
						# variable to find the leader's host, comment out the 'value: dns' line above, and
						# uncomment the line below:
						# value: "env"
					)],
					ports=[ContainerPortArgs(
						container_port=6379,
					)],
				)],
			),
		),
	))

redis_replica_service = Service(
	"redis-replica",
	metadata=ObjectMetaArgs(
		name="redis-replica",
		labels=redis_replica_labels
	),
	spec=ServiceSpecArgs(
		ports=[ServicePortArgs(
			port=6379,
			target_port=6379,
		)],
		selector=redis_replica_labels
	))

# Frontend
frontend_labels = {
	"app": "frontend",
}

frontend_deployment = Deployment(
	"frontend",
	spec=DeploymentSpecArgs(
		selector=LabelSelectorArgs(
			match_labels=frontend_labels,
		),
		replicas=3,
		template=PodTemplateSpecArgs(
			metadata=ObjectMetaArgs(
				labels=frontend_labels,
			),
			spec=PodSpecArgs(
				containers=[ContainerArgs(
					name="php-redis",
					image="pulumi/guestbook-php-redis",
					resources=ResourceRequirementsArgs(
						requests={
							"cpu": "100m",
							"memory": "100Mi",
						},
					),
					env=[EnvVarArgs(
						name="GET_HOSTS_FROM",
						value="dns",
						# If your cluster config does not include a dns service, then to instead access an environment
						# variable to find the leader's host, comment out the 'value: dns' line above, and
						# uncomment the line below:
						# "value": "env"
					)],
					ports=[ContainerPortArgs(
						container_port=80,
					)],
				)],
			),
		),
	))

frontend_service = Service(
	"frontend",
	metadata=ObjectMetaArgs(
		name="frontend",
		labels=frontend_labels,
	),
	spec=ServiceSpecArgs(
		type="ClusterIP" if isMinikube else "LoadBalancer",
		ports=[ServicePortArgs(
			port=80
		)],
		selector=frontend_labels,
	))

frontend_ip = ""
if isMinikube:
	frontend_ip = frontend_service.spec.apply(lambda spec: spec.cluster_ip or "")
else:
	ingress = frontend_service.status.apply(lambda status: status.load_balancer.ingress[0])
	frontend_ip = ingress.apply(lambda ingress: ingress.ip or ingress.hostname or "")
pulumi.export("frontend_ip", frontend_ip)
