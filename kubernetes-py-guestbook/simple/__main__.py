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
from pulumi_kubernetes.apps.v1 import Deployment
from pulumi_kubernetes.core.v1 import Service, Namespace

# Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
# running on minikube, and if so, create only services of type ClusterIP.
config = pulumi.Config()
isMinikube = config.get_bool("isMinikube")

redis_leader_labels = {
	"app": "redis-leader",
}

redis_leader_deployment = Deployment(
	"redis-leader",
	spec={
		"selector": {
			"match_labels": redis_leader_labels,
		},
		"replicas": 1,
		"template": {
			"metadata": {
				"labels": redis_leader_labels,
			},
			"spec": {
				"containers": [{
					"name": "redis-leader",
					"image": "redis",
					"resources": {
						"requests": {
							"cpu": "100m",
							"memory": "100Mi",
						},
					},
					"ports": [{
						"container_port": 6379,
					}],
				}],
			},
		},
	})

redis_leader_service = Service(
	"redis-leader",
	metadata={
		"name": "redis-leader",
		"labels": redis_leader_labels
	},
	spec={
		"ports": [{
			"port": 6379,
			"target_port": 6379,
		}],
		"selector": redis_leader_labels
	})

redis_replica_labels = {
	"app": "redis-replica",
}

redis_replica_deployment = Deployment(
	"redis-replica",
	spec={
		"selector": {
			"match_labels": redis_replica_labels
		},
		"replicas": 1,
		"template": {
			"metadata": {
				"labels": redis_replica_labels,
			},
			"spec": {
				"containers": [{
					"name": "redis-replica",
					"image": "pulumi/guestbook-redis-replica",
					"resources": {
						"requests": {
							"cpu": "100m",
							"memory": "100Mi",
						},
					},
					"env": [{
						"name": "GET_HOSTS_FROM",
						"value": "dns",
						# If your cluster config does not include a dns service, then to instead access an environment
						# variable to find the leader's host, comment out the 'value: dns' line above, and
						# uncomment the line below:
						# value: "env"
					}],
					"ports": [{
						"container_port": 6379,
					}],
				}],
			},
		},
	})

redis_replica_service = Service(
	"redis-replica",
	metadata={
		"name": "redis-replica",
		"labels": redis_replica_labels
	},
	spec={
		"ports": [{
			"port": 6379,
			"target_port": 6379,
		}],
		"selector": redis_replica_labels
	})

# Frontend
frontend_labels = {
	"app": "frontend",
}

frontend_deployment = Deployment(
	"frontend",
	spec={
		"selector": {
			"match_labels": frontend_labels,
		},
		"replicas": 3,
		"template": {
			"metadata": {
				"labels": frontend_labels,
			},
			"spec": {
				"containers": [{
					"name": "php-redis",
					"image": "pulumi/guestbook-php-redis",
					"resources": {
						"requests": {
							"cpu": "100m",
							"memory": "100Mi",
						},
					},
					"env": [{
						"name": "GET_HOSTS_FROM",
						"value": "dns",
						# If your cluster config does not include a dns service, then to instead access an environment
						# variable to find the leader's host, comment out the 'value: dns' line above, and
						# uncomment the line below:
						# "value": "env"
					}],
					"ports": [{
						"container_port": 80,
					}],
				}],
			},
		},
	})

frontend_service = Service(
	"frontend",
	metadata={
		"name": "frontend",
		"labels": frontend_labels,
	},
	spec={
		"type": "ClusterIP" if isMinikube else "LoadBalancer",
		"ports": [{
			"port": 80
		}],
		"selector": frontend_labels,
	})

frontend_ip = ""
if isMinikube:
	frontend_ip = frontend_service.spec.apply(lambda spec: spec.get("cluster_ip", ""))
else:
	ingress = frontend_service.status.apply(lambda status: status["load_balancer"]["ingress"][0])
	frontend_ip = ingress.apply(lambda ingress: ingress.get("ip", ingress.get("hostname", "")))
pulumi.export("frontend_ip", frontend_ip)
