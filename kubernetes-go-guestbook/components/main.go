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
	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/v2/go/kubernetes/core/v1"
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

		// Redis leader Deployment + Service
		_, err := NewServiceDeployment(ctx, "redis-master", &ServiceDeploymentArgs{
			Image: pulumi.String("k8s.gcr.io/redis:e2e"),
			Ports: pulumi.IntArray{pulumi.Int(6379)},
		})
		if err != nil {
			return err
		}

		// Redis follower Deployment + Service
		_, err = NewServiceDeployment(ctx, "redis-slave", &ServiceDeploymentArgs{
			Image: pulumi.String("gcr.io/google_samples/gb-redisslave:v3"),
			Ports: pulumi.IntArray{pulumi.Int(6379)},
		})
		if err != nil {
			return err
		}

		// Frontend Deployment + Service
		frontend, err := NewServiceDeployment(ctx, "frontend", &ServiceDeploymentArgs{
			AllocateIPAddress: true,
			Image:             pulumi.String("gcr.io/google-samples/gb-frontend:v4"),
			IsMinikube:        pulumi.Bool(isMinikube),
			Ports:             pulumi.IntArray{pulumi.Int(80)},
			Replicas:          pulumi.Int(3),
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
