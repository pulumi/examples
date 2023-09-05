package main

import (
	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/v4/go/kubernetes/core/v1"
	helmv3 "github.com/pulumi/pulumi-kubernetes/sdk/v4/go/kubernetes/helm/v3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Deploy the bitnami/wordpress chart.
		wordpress, err := helmv3.NewChart(ctx, "wpdev", helmv3.ChartArgs{
			// Version: pulumi.String("17.1.2"),
			Chart:   pulumi.String("wordpress"),
			FetchArgs: &helmv3.FetchArgs{
				Repo: pulumi.String("https://charts.bitnami.com/bitnami"),
			},
		})

		if err != nil {
			return err
		}

		// Export the public IP for WordPress.

		frontendIP := wordpress.GetResource("v1/Service", "wpdev-wordpress", "default").ApplyT(func(r interface{}) (pulumi.StringPtrOutput, error) {
			svc := r.(*corev1.Service)
			return svc.Status.LoadBalancer().Ingress().Index(pulumi.Int(0)).Ip(), nil
		})
		ctx.Export("frontendIp", frontendIP)

		return nil
	})
}
