// Copyright 2016-2020, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	appsv1 "github.com/pulumi/pulumi-kubernetes/sdk/v2/go/kubernetes/apps/v1"
	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/v2/go/kubernetes/core/v1"
	metav1 "github.com/pulumi/pulumi-kubernetes/sdk/v2/go/kubernetes/meta/v1"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Initialize config
		conf := config.New(ctx, "")

		// Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
		// running on minikube, and if so, create only services of type ClusterIP.
		isMinikube := conf.GetBool("isMinikube")

		redisLeaderLabels := pulumi.StringMap{
			"app":  pulumi.String("redis"),
			"tier": pulumi.String("backend"),
			"role": pulumi.String("master"),
		}

		// Redis leader Deployment
		_, err := appsv1.NewDeployment(ctx, "redis-leader", &appsv1.DeploymentArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Labels: redisLeaderLabels,
			},
			Spec: appsv1.DeploymentSpecArgs{
				Selector: &metav1.LabelSelectorArgs{
					MatchLabels: redisLeaderLabels,
				},
				Replicas: pulumi.Int(1),
				Template: &corev1.PodTemplateSpecArgs{
					Metadata: &metav1.ObjectMetaArgs{
						Labels: redisLeaderLabels,
					},
					Spec: &corev1.PodSpecArgs{
						Containers: corev1.ContainerArray{
							corev1.ContainerArgs{
								Name:  pulumi.String("master"),
								Image: pulumi.String("k8s.gcr.io/redis:e2e"),
								Resources: &corev1.ResourceRequirementsArgs{
									Requests: pulumi.StringMap{
										"cpu":    pulumi.String("100m"),
										"memory": pulumi.String("100Mi"),
									},
								},
								Ports: corev1.ContainerPortArray{
									&corev1.ContainerPortArgs{
										ContainerPort: pulumi.Int(6379),
									},
								},
							}},
					},
				},
			},
		})
		if err != nil {
			return err
		}

		// Redis leader Service
		_, err = corev1.NewService(ctx, "redis-leader", &corev1.ServiceArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Name:   pulumi.String("redis-master"),
				Labels: redisLeaderLabels,
			},
			Spec: &corev1.ServiceSpecArgs{
				Ports: corev1.ServicePortArray{
					corev1.ServicePortArgs{
						Port:       pulumi.Int(6379),
						TargetPort: pulumi.Int(6379),
					},
				},
				Selector: redisLeaderLabels,
			},
		})
		if err != nil {
			return err
		}

		redisFollowerLabels := pulumi.StringMap{
			"app":  pulumi.String("redis"),
			"tier": pulumi.String("backend"),
			"role": pulumi.String("slave"),
		}

		// Redis follower Deployment
		_, err = appsv1.NewDeployment(ctx, "redis-follower", &appsv1.DeploymentArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Labels: redisFollowerLabels,
			},
			Spec: appsv1.DeploymentSpecArgs{
				Selector: &metav1.LabelSelectorArgs{
					MatchLabels: redisFollowerLabels,
				},
				Replicas: pulumi.Int(2),
				Template: &corev1.PodTemplateSpecArgs{
					Metadata: &metav1.ObjectMetaArgs{
						Labels: redisFollowerLabels,
					},
					Spec: &corev1.PodSpecArgs{
						Containers: corev1.ContainerArray{
							corev1.ContainerArgs{
								Name:  pulumi.String("slave"),
								Image: pulumi.String("gcr.io/google_samples/gb-redisslave:v3"),
								Resources: &corev1.ResourceRequirementsArgs{
									Requests: pulumi.StringMap{
										"cpu":    pulumi.String("100m"),
										"memory": pulumi.String("100Mi"),
									},
								},
								Env: corev1.EnvVarArray{
									corev1.EnvVarArgs{
										Name:  pulumi.String("GET_HOSTS_FROM"),
										Value: pulumi.String("dns"),
									},
								},
								Ports: corev1.ContainerPortArray{
									&corev1.ContainerPortArgs{
										ContainerPort: pulumi.Int(6379),
									},
								},
							}},
					},
				},
			},
		})
		if err != nil {
			return err
		}

		// Redis follower Service
		_, err = corev1.NewService(ctx, "redis-follower", &corev1.ServiceArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Name:   pulumi.String("redis-slave"),
				Labels: redisFollowerLabels,
			},
			Spec: &corev1.ServiceSpecArgs{
				Ports: corev1.ServicePortArray{
					corev1.ServicePortArgs{
						Port: pulumi.Int(6379),
					},
				},
				Selector: redisFollowerLabels,
			},
		})
		if err != nil {
			return err
		}

		frontendLabels := pulumi.StringMap{
			"app":  pulumi.String("guestbook"),
			"tier": pulumi.String("frontend"),
		}

		// Frontend Deployment
		_, err = appsv1.NewDeployment(ctx, "frontend", &appsv1.DeploymentArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Labels: frontendLabels,
			},
			Spec: appsv1.DeploymentSpecArgs{
				Selector: &metav1.LabelSelectorArgs{
					MatchLabels: frontendLabels,
				},
				Replicas: pulumi.Int(1),
				Template: &corev1.PodTemplateSpecArgs{
					Metadata: &metav1.ObjectMetaArgs{
						Labels: frontendLabels,
					},
					Spec: &corev1.PodSpecArgs{
						Containers: corev1.ContainerArray{
							corev1.ContainerArgs{
								Name:  pulumi.String("php-redis"),
								Image: pulumi.String("gcr.io/google-samples/gb-frontend:v4"),
								Resources: &corev1.ResourceRequirementsArgs{
									Requests: pulumi.StringMap{
										"cpu":    pulumi.String("100m"),
										"memory": pulumi.String("100Mi"),
									},
								},
								Env: corev1.EnvVarArray{
									corev1.EnvVarArgs{
										Name:  pulumi.String("GET_HOSTS_FROM"),
										Value: pulumi.String("dns"),
									},
								},
								Ports: corev1.ContainerPortArray{
									&corev1.ContainerPortArgs{
										ContainerPort: pulumi.Int(80),
									},
								},
							}},
					},
				},
			},
		})
		if err != nil {
			return err
		}

		// Frontend Service
		var frontendServiceType string
		if isMinikube {
			frontendServiceType = "ClusterIP"
		} else {
			frontendServiceType = "LoadBalancer"
		}
		frontendService, err := corev1.NewService(ctx, "frontend", &corev1.ServiceArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Labels: frontendLabels,
				Name:   pulumi.String("frontend"),
			},
			Spec: &corev1.ServiceSpecArgs{
				Type: pulumi.String(frontendServiceType),
				Ports: corev1.ServicePortArray{
					corev1.ServicePortArgs{
						Port: pulumi.Int(80),
					},
				},
				Selector: frontendLabels,
			},
		})
		if err != nil {
			return err
		}

		if isMinikube {
			ctx.Export("frontendIP", frontendService.Spec.ApplyT(func(spec *corev1.ServiceSpec) *string {
				return spec.ClusterIP
			}))
		} else {
			ctx.Export("frontendIP", frontendService.Status.ApplyT(func(status *corev1.ServiceStatus) *string {
				ingress := status.LoadBalancer.Ingress[0]
				if ingress.Hostname != nil {
					return ingress.Hostname
				}
				return ingress.Ip
			}))
		}

		return nil
	})
}
