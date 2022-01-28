package main

import (
	"fmt"
	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/core/v1"
	"github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/helm/v3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Deploy the bitnami/wordpress chart.

		wordpress, err := helm.NewRelease(ctx, "wpdev", &helm.ReleaseArgs{
			Version: pulumi.String("13.0.6"),
			Chart:   pulumi.String("wordpress"),
			Values:  pulumi.Map{"service": pulumi.StringMap{"type": pulumi.String("ClusterIP")}},
			RepositoryOpts: &helm.RepositoryOptsArgs{
				Repo: pulumi.String("https://charts.bitnami.com/bitnami"),
			},
		})


		svc, err := corev1.GetService(ctx, "svc", pulumi.ID(pulumi.Sprintf("%s/%s-wordpress", wordpress.Status.Namespace(), wordpress.Status.Name())), nil)
		if err != nil {
			return err
		}
		ctx.Export("frontendIp", svc.Spec.ClusterIP())
		// result := pulumi.All(wordpress.Status.Namespace(), wordpress.Status.Name()).ApplyT(func(r interface{}) ([]*string, error) {

		// 	arr := r.([]interface{})
		// 	namespace := arr[0].(*string)
		// 	name := arr[1].(*string)
		// 	svc, err := corev1.GetService(ctx, "svc", pulumi.ID(fmt.Sprintf("%s/%s-wordpress", *namespace, *name)), nil)
		// 	if err != nil {
		// 		return nil, err
		// 	}

		// 	pulumi.All(svc.Metadata.Name(), svc.Spec.ClusterIP()).
		// 	out := []string{svc.Metadata.Name(), svc.Spec.ClusterIP()}

		// 	return out, nil
		// })

		// res := result.(pulumi.ArrayOutput)
		// ctx.Export("result", res.Index(pulumi.Int(1)))

		// if err != nil {
		// 	return err
		// }

		return nil
	})
}
