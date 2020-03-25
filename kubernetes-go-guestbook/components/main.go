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
	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/go/kubernetes/core/v1"
	"github.com/pulumi/pulumi/sdk/go/pulumi"
	"github.com/pulumi/pulumi/sdk/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Initialize config
		conf := config.New(ctx, "")

		// Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
		// running on minikube, and if so, create only services of type ClusterIP.
		isMinikube := conf.GetBool("isMinikube")

		// Redis leader Deployment + Service
		_, err := NewServiceDeployment(ctx, "redis-master", &ServiceDeploymentArgs{
			Image: pulumi.String("k8s.gcr.io/redis:e2e"),
			Labels: pulumi.StringMap{
				"app":  pulumi.String("redis"),
				"tier": pulumi.String("backend"),
				"role": pulumi.String("master"),
			},
			Ports:    pulumi.IntArray{pulumi.Int(6379)},
			Replicas: pulumi.Int(1),
		})
		if err != nil {
			return err
		}

		// Redis follower Deployment + Service
		_, err = NewServiceDeployment(ctx, "redis-slave", &ServiceDeploymentArgs{
			Env: corev1.EnvVarArray{
				corev1.EnvVarArgs{
					Name:  pulumi.String("GET_HOSTS_FROM"),
					Value: pulumi.String("dns"),
				},
			},
			Image: pulumi.String("gcr.io/google_samples/gb-redisslave:v3"),
			Labels: pulumi.StringMap{
				"app":  pulumi.String("redis"),
				"tier": pulumi.String("backend"),
				"role": pulumi.String("slave"),
			},
			Ports:    pulumi.IntArray{pulumi.Int(6379)},
			Replicas: pulumi.Int(2),
			Resources: corev1.ResourceRequirementsArgs{
				Requests: pulumi.StringMap{
					"cpu":    pulumi.String("100m"),
					"memory": pulumi.String("100Mi"),
				},
			},
		})
		if err != nil {
			return err
		}

		var frontendServiceType string
		if isMinikube {
			frontendServiceType = "ClusterIP"
		} else {
			frontendServiceType = "LoadBalancer"
		}
		// Frontend Deployment + Service
		frontend, err := NewServiceDeployment(ctx, "frontend", &ServiceDeploymentArgs{
			Env: corev1.EnvVarArray{
				corev1.EnvVarArgs{
					Name:  pulumi.String("GET_HOSTS_FROM"),
					Value: pulumi.String("dns"),
				},
			},
			Image: pulumi.String("gcr.io/google-samples/gb-frontend:v4"),
			Labels: pulumi.StringMap{
				"app":  pulumi.String("guestbook"),
				"tier": pulumi.String("frontend"),
			},
			Ports:    pulumi.IntArray{pulumi.Int(80)},
			Replicas: pulumi.Int(1),
			Resources: corev1.ResourceRequirementsArgs{
				Requests: pulumi.StringMap{
					"cpu":    pulumi.String("100m"),
					"memory": pulumi.String("100Mi"),
				},
			},
			ServiceType: pulumi.StringPtr(frontendServiceType),
		})
		if err != nil {
			return err
		}

		if isMinikube {
			ctx.Export("frontendIP", frontend.Service.Spec.ApplyT(
				func(spec *corev1.ServiceSpec) *string { return spec.ClusterIP }))
		} else {
			ctx.Export("frontendIP", frontend.FrontendIP)
		}

		return nil
	})
}
