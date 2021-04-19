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
	appsv1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/apps/v1"
	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/core/v1"
	metav1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/meta/v1"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type ServiceDeployment struct {
	pulumi.ResourceState

	FrontendIP pulumi.StringPtrOutput
	Deployment *appsv1.Deployment
	Service    *corev1.Service
}

type ServiceDeploymentArgs struct {
	AllocateIPAddress pulumi.Bool
	Image             pulumi.StringInput
	IsMinikube        pulumi.Bool
	Ports             pulumi.IntArrayInput
	Replicas          pulumi.IntPtrInput
}

func NewServiceDeployment(
	ctx *pulumi.Context, name string, args *ServiceDeploymentArgs, opts ...pulumi.ResourceOption,
) (*ServiceDeployment, error) {
	serviceDeployment := &ServiceDeployment{}
	err := ctx.RegisterComponentResource(
		"kubernetes-go-guestbook:component:ServiceDeployment",
		name, serviceDeployment, opts...)
	if err != nil {
		return nil, err
	}

	labels := pulumi.StringMap{"app": pulumi.String(name)}

	portsOutput := args.Ports.ToIntArrayOutput()

	deploymentPorts := portsOutput.ApplyT(func(ports []int) []corev1.ContainerPort {
		var result []corev1.ContainerPort
		for _, port := range ports {
			result = append(result, corev1.ContainerPort{
				ContainerPort: port,
			})
		}
		return result
	}).(corev1.ContainerPortArrayOutput)

	serviceDeployment.Deployment, err = appsv1.NewDeployment(ctx, name, &appsv1.DeploymentArgs{
		Metadata: &metav1.ObjectMetaArgs{
			Labels: labels,
			Name:   pulumi.String(name),
		},
		Spec: appsv1.DeploymentSpecArgs{
			Selector: &metav1.LabelSelectorArgs{
				MatchLabels: labels,
			},
			Replicas: args.Replicas,
			Template: &corev1.PodTemplateSpecArgs{
				Metadata: &metav1.ObjectMetaArgs{
					Labels: labels,
				},
				Spec: &corev1.PodSpecArgs{
					Containers: corev1.ContainerArray{
						corev1.ContainerArgs{
							Name:  pulumi.String(name),
							Image: args.Image.ToStringOutput(),
							Env: corev1.EnvVarArray{
								corev1.EnvVarArgs{
									Name:  pulumi.String("GET_HOSTS_FROM"),
									Value: pulumi.String("dns"),
								},
							},
							Ports: deploymentPorts,
							Resources: corev1.ResourceRequirementsArgs{
								Requests: pulumi.StringMap{
									"cpu":    pulumi.String("100m"),
									"memory": pulumi.String("100Mi"),
								},
							},
						}},
				},
			},
		},
	}, pulumi.Parent(serviceDeployment))
	if err != nil {
		return nil, err
	}

	servicePorts := portsOutput.ApplyT(func(ports []int) []corev1.ServicePort {
		var result []corev1.ServicePort
		for _, port := range ports {
			result = append(result, corev1.ServicePort{
				Port:       port,
				TargetPort: port,
			})
		}
		return result
	}).(corev1.ServicePortArrayOutput)

	var serviceType pulumi.String
	if args.AllocateIPAddress {
		if args.IsMinikube {
			serviceType = "ClusterIP"
		} else {
			serviceType = "LoadBalancer"
		}
	}

	serviceDeployment.Service, err = corev1.NewService(ctx, name, &corev1.ServiceArgs{
		Metadata: &metav1.ObjectMetaArgs{
			Labels: labels,
			Name:   pulumi.String(name),
		},
		Spec: &corev1.ServiceSpecArgs{
			Ports:    servicePorts,
			Selector: labels,
			Type:     serviceType,
		},
	}, pulumi.Parent(serviceDeployment))
	if err != nil {
		return nil, err
	}

	serviceDeployment.FrontendIP = serviceDeployment.Service.Status.ApplyT(
		func(status *corev1.ServiceStatus) *string {
			if status.LoadBalancer.Ingress != nil {
				ingress := status.LoadBalancer.Ingress[0]
				if ingress.Hostname != nil {
					return ingress.Hostname
				}
				return ingress.Ip
			}

			return nil
		}).(pulumi.StringPtrOutput)

	return serviceDeployment, nil
}
