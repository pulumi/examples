package main

import (
	appsv1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/apps/v1"
	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/core/v1"
	metav1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/meta/v1"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
		// running on minikube, and if so, create only services of type ClusterIP.
		config := config.New(ctx, "")
		isMinikube := config.Require("isMinikube")

		// nginx container, replicated 1 time
		appName := "nginx"
		appLabels := pulumi.StringMap{
			"app": pulumi.String(appName),
		}
		_, err := appsv1.NewDeployment(ctx, "nginx", &appsv1.DeploymentArgs{
			// _, err := appsv1.NewDeployment(ctx, "nginx", &appsv1.DeploymentArgs{
			Spec: appsv1.DeploymentSpecArgs{
				Selector: &metav1.LabelSelectorArgs{
					MatchLabels: appLabels,
				},
				Replicas: pulumi.Int(1),
				Template: &corev1.PodTemplateSpecArgs{
					Metadata: &metav1.ObjectMetaArgs{
						Labels: appLabels,
					},
					Spec: &corev1.PodSpecArgs{
						Containers: corev1.ContainerArray{
							corev1.ContainerArgs{
								Name:  pulumi.String(appName),
								Image: pulumi.String("nginx:1.15-alpine"),
							},
						},
					},
				},
			},
		})
		if err != nil {
			return err
		}
		// Allocate an IP to the nginx deployment.
		var frontendServiceType string
		if isMinikube == "true" {
			frontendServiceType = "ClusterIP"
		} else {
			frontendServiceType = "LoadBalancer"
		}

		frontend, err := corev1.NewService(ctx, appName, &corev1.ServiceArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Labels: appLabels,
			},
			Spec: &corev1.ServiceSpecArgs{
				Type: pulumi.String(frontendServiceType),
				Ports: &corev1.ServicePortArray{
					corev1.ServicePortArgs{
						Port:       pulumi.Int(80),
						TargetPort: pulumi.Int(80),
						Protocol:   pulumi.String("TCP"),
					},
				},
				Selector: appLabels,
			},
		})

		if err != nil {
			return err
		}

		// Export the public IP

		if isMinikube == "true" {
			ctx.Export("frontendIp", frontend.Spec.ApplyT(func(spec *corev1.ServiceSpec) *string {
				return spec.ClusterIP
			}))
		} else {
			ctx.Export("frontendIp", frontend.Status.ApplyT(func(status *corev1.ServiceStatus) *string {
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
