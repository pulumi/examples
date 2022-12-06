// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

package main

import (
	v1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/core/v1"
	"github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/helm/v3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		cfg, err := configure(ctx)
		if err != nil {
			return err
		}

		k8sCluster, err := buildCluster(ctx, cfg)
		if err != nil {
			return err
		}

		kubeconfig := getKubeconfig(ctx, k8sCluster)

		k8sProvider, err := buildProvider(ctx, k8sCluster, kubeconfig)
		if err != nil {
			return err
		}

		chartArgs := helm.ChartArgs{
			Chart:   pulumi.String("apache"),
			Version: pulumi.String("8.12.1"),
			FetchArgs: helm.FetchArgs{
				Repo: pulumi.String("https://raw.githubusercontent.com/bitnami/charts/archive-full-index/bitnami"),
			},
		}

		chart, err := helm.NewChart(ctx, "apache-chart", chartArgs,
			pulumi.Providers(k8sProvider))
		if err != nil {
			return err
		}

		ip := chart.GetResource("v1/Service", "apache-chart", "").
			ApplyT(func(input interface{}) pulumi.StringPtrOutput {
				service := input.(*v1.Service)
				return service.Status.LoadBalancer().
					Ingress().Index(pulumi.Int(0)).Ip()
			})

		ctx.Export("apacheServiceIP", ip)
		ctx.Export("kubeconfig", kubeconfig)
		ctx.Export("clusterName", k8sCluster.ManagedCluster.Name)

		return nil
	})
}
